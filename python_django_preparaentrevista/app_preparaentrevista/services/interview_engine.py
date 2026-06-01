from ..models import AnswerEvaluation, EvaluationResult, ChatMessage
import logging
import inspect
import re

class InterviewEngine:

    def __init__(self, session, agents, memory):
        self.logger = logging.getLogger(__name__)
        self.logger.info("InterviewEngine - __init__ : inicio ")
        self.session = session
        self.jd_agent = agents["jd"]
        self.question_agent = agents["question"]
        self.evaluation_agent = agents["evaluation"]
        self.report_agent = agents["report"]
        self.cultural_agent = agents["cultural"]
        self.memory = memory
        self.logger.info("InterviewEngine - __init__ : fin ")


    # 🔹 iniciar entrevista
    def start(self, profile):
        self.logger.info("start: inicio ")
        existen_preguntas = False
        questions_list = self.question_agent.generate_questions(profile)

        # convertir a lista
        #questions_list = [q.strip() for q in questions.split("\n") if q.strip()]

        if not questions_list:
            #raise Exception("No se generaron preguntas")
            return existen_preguntas

        self.session.questions = questions_list
        self.session.current_question_index = 0
        self.session.score_data = {
            "technical": [],
            "communication": [],
            "overall": []
        }

        # Generamos nombre de la sesión
        #if (self.session.questions.session_name):
        if not self.session.session_name or not self.session.session_name.strip():
            self.session.session_name = f"{self.__genera_session_name(questions_list)}-{self.session.id}"

        self.session.save()

        # guardar en memoria
        self.memory.save_context(
            {"input": "JD_PROFILE"},
            {"output": profile}
        )

        self.logger.info("start: fin ")
        del questions_list
        existen_preguntas = True
        #return questions_list[0]
        return existen_preguntas

    def __genera_session_name(self, questions_list, limit=30):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        candidate_name = ""
        try:
            q_obj = questions_list[1] 
            if isinstance(q_obj, dict) and "question" in q_obj:
                text = str(q_obj["question"])
                # Buscar el primer espacio después de la posición 'limit'
                cut_index = limit
                while cut_index < len(text) and text[cut_index] != " ":
                    cut_index += 1

                # Si encontramos un espacio, cortamos allí; si no, cortamos en 'limit'
                truncated = text[:cut_index] if cut_index < len(text) else text[:limit]

                truncated = re.sub(r"[¿?!¡]", "", truncated)

                candidate_name = truncated #str(q_obj["question"])[:30]
        except Exception:
            candidate_name = "Sesión"

        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return candidate_name

    # 🔹 obtener siguiente pregunta
    def get_current_question_ant(self):
        self.logger.info("get_current_question: inicio ")
        if not self.session.questions:
            return "No hay preguntas generadas."
        
        index = self.session.current_question_index

        if index < len(self.session.questions):
            self.logger.info("get_current_question: fin ")
            return self.session.questions[index]
        
        self.logger.info("get_current_question: fin2 ")
        return None
    
    def get_current_question(self):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        if not self.session.questions:
            payload = {
                "order": 0,
                "type": "general",
                "question": "No hay preguntas generadas.",
                "show_header": True
            }

            return payload
        
        index = self.session.current_question_index

        if index < len(self.session.questions):
            question = self.session.questions[index]  # dict con {"type":..., "question":...}

            # Avanzar índice para la próxima llamada
            if (int(question["order"])==0):
                self.session.current_question_index += 1
                self.session.save()

            payload = dict(question)

            # Verificar si es la primera pregunta o si cambió el tipo
            if index == 0 or question["type"] != self.session.questions[index-1]["type"]:
                payload["show_header"] = True
            else:
                payload["show_header"] = False

            if (int(question["order"])==0):
                # 🔹 Guardar pregunta (sistema)
                question_msg = ChatMessage.objects.create(
                    session=self.session,
                    role="system",
                    order=int(question["order"]),
                    question_number=index,
                    content=question["question"]
                )
                question_msg.reply_to = question_msg
                question_msg.save()

                AnswerEvaluation.objects.create(
                    session=self.session,
                    type=question["type"],
                    question_number=index, 
                    question=question["question"],
                    answer="",
                    evaluation=""
                )


            self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
            return payload
        
        user = self.session.user  # Usuario asociado a la sesión
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin - usuario={user.id} ({user.username})")

        payload = {
            "order": 0,
            "type": "general",
            "question": None,
            "show_header": False
        }

        return payload

    # 🔹 procesar respuesta (LOOP)
    def process_answer(self, answer):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        #index = self.session.current_question_index - 1
        index = self.session.current_question_index

        if index >= len(self.session.questions):
            # return {"error": "No hay más preguntas"}
            if self._is_finished():
                self.session.is_close = True
                self.session.save()
                return self._finalize()
        
        question = self.session.questions[index]

        # 🔹 Guardar pregunta (sistema)
        question_msg = ChatMessage.objects.create(
            session=self.session,
            role="system",
            order=int(question["order"]),
            question_number=index,
            content=question["question"]
        )

        # 🔹 Guardar respuesta (usuario)
        ChatMessage.objects.create(
            session=self.session,
            role="user",
            order=int(question["order"]),
            question_number=index,
            content=answer,
            reply_to=question_msg
        )

        # 1. evaluar
        evaluation = self.evaluation_agent.evaluate_answer(question["question"], answer)

        # 2. guardar evaluación
        AnswerEvaluation.objects.create(
            session=self.session,
            type=question["type"],
            question_number=index, 
            question=question["question"],
            answer=answer,
            evaluation=evaluation
        )

        self.memory.save_context(
            {"question": question["question"]},
            {"answer": answer}
        )

        # 3. actualizar scoring
        self._update_score(evaluation)

        # 4. avanzar índice
        self.session.current_question_index += 1
        self.session.is_close = False
        self.session.save()

        # 5. verificar fin
        if self._is_finished():
            self.session.is_close = True
            self.session.save()
            return self._finalize()
        
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        
        return self.get_current_question()
        #return {
        #    "next_question": self.get_current_question(),
        #    "progress": self.session.current_question_index
        #}

    # 🔹 actualizar score
    def _update_score(self, evaluation):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        current = self.session.score_data or {
            "technical": 0,
            "communication": 0,
            "overall": 0
        }

        # simplificado (puedes parsear JSON real)
        try:
            current["technical"].append(evaluation.get("technical", 0))
            current["communication"].append(evaluation.get("communication", 0))
            current["overall"].append(evaluation.get("overall", 0))
        except:
            current["overall"].append(str(evaluation))

        self.session.score_data = current
        self.session.save()
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")

    # 🔹 condición de término
    def _is_finished(self):
        return self.session.current_question_index >= len(self.session.questions)

    # 🔹 cierre
    def _finalize(self):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        history = list(
            self.session.answerevaluation_set.values()
        )

        #cultural = self.cultural_agent.run(str(history))
        cultural = self.cultural_agent.evaluate_culture(str(history))
        report = self.report_agent.generate_report(str(history))

        # 👉 calcular promedios
        scores = self.session.score_data
        def avg(lst):
            #return sum(lst) / len(lst) if lst else 0
            validos = [x for x in lst if x is not None]
            return sum(validos) / len(validos) if validos else 0


        EvaluationResult.objects.create(
            session=self.session,
            technical_score=avg(scores["technical"]),
            communication_score=avg(scores["communication"]),
            cultural_score=cultural['cultural_affinity_score'],  
            report=f"{report}\n\n\n{cultural['cultural']}"
        )

        self.session.is_active = False
        self.session.save()

        # 🔹 Capturar el usuario asociado a la sesión
        user = self.session.user  
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin - usuario={user.id} ({user.username})")
        return {
            "finished": True,
            "cultural": cultural,
            "report": report,
            "history": history
        }