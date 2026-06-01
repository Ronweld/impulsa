from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services.llm_config import LLMConfig
from .services.web_tool import WebSearchTool
from .models import InterviewSession, AgentTemplate, JobDescription, EvaluationResult, AnswerEvaluation, ChatMessage, User
from .services.document_loader import DocumentLoaderService
from .services.agent_factory import AgentFactory
from .services.memory_manager import MemoryManager
from .services.rag_engine import RAGEngine
from .agents.jd_agent import JDAgent
from .agents.question_agent import QuestionAgent
from .agents.evaluation_agent import EvaluationAgent
from .agents.report_agent import ReportAgent
from .agents.cultural_agent import CulturalAgent
from .services.interview_engine import InterviewEngine
import logging
import inspect

# 🔑 Definición del serializer dentro de views.py
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'email': {'required': False},
            'phone_number': {'required': False},
        }

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

class UserViewSetxxx(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # o IsAuthenticated si quieres restringir

    def create(self, request, *args, **kwargs):
        username = request.data.get("username")

        # Buscar si ya existe usuario por username o email
        if User.objects.filter(username=username).exists(): #or User.objects.filter(email=email).exists():
            return Response(
                {"message": "Existe", "username": username},
                status=status.HTTP_200_OK
            )

        # Si no existe, crear normalmente
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Creado", "username": serializer.data.get("username")},
            status=status.HTTP_201_CREATED
        )

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    # Endpoint público: creación sin autenticación
    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="public")
    def public_create(self, request, *args, **kwargs):
        username = request.data.get("username")

        if User.objects.filter(username=username).exists():
            return Response(
                {"message": "Existe", "username": username},
                status=status.HTTP_200_OK
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Creado", "username": serializer.data.get("username")},
            status=status.HTTP_201_CREATED
        )

    # Endpoint protegido: creación con autenticación
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="protected")
    def protected_create(self, request, *args, **kwargs):
        username = request.data.get("username")

        if User.objects.filter(username=username).exists():
            return Response(
                {"message": "Existe", "username": username},
                status=status.HTTP_200_OK
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Creado", "username": serializer.data.get("username")},
            status=status.HTTP_201_CREATED
        )

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer

    logger = logging.getLogger(__name__)
    def get_queryset(self):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        session_id = self.request.query_params.get("session_id")
        if session_id:
            self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
            return self.queryset.filter(session_id=session_id)
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio2 ")
        return self.queryset

class EvaluationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationResult
        fields = '__all__'

class EvaluationResultViewSet(viewsets.ModelViewSet):
    queryset = EvaluationResult.objects.all()
    serializer_class = EvaluationResultSerializer

class AnswerEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerEvaluation
        fields = '__all__'

class AnswerEvaluationViewSet(viewsets.ModelViewSet):
    queryset = AnswerEvaluation.objects.all()
    serializer_class = AnswerEvaluationSerializer

class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = '__all__'

class JobDescriptionViewSet(viewsets.ModelViewSet):
    queryset = JobDescription.objects.all()
    serializer_class = JobDescriptionSerializer
    permission_classes = [IsAuthenticated]

    logger = logging.getLogger(__name__)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.logger.info(f"{inspect.currentframe().f_code.co_name}, JobDescription creado con ID={instance.id}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self.logger.info(f"{inspect.currentframe().f_code.co_name}, JobDescription actualizado con ID={instance.id}")

    def perform_destroy(self, instance):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}, JobDescription eliminado con ID={instance.id}")
        instance.delete()

class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        #fields = '__all__'   # o lista explícita de campos si prefieres
        fields = ["id", "jd","session_name","user", "created_at", "expires_at", "is_active","current_question_index","is_close"]
        read_only_fields = ["session_name","user", "created_at", "expires_at", "is_active","current_question_index","is_close"]

class InterviewSessionViewSet(viewsets.ModelViewSet):
    #logger = logging.getLogger(__name__)
    #queryset = InterviewSession.objects.all()
    #serializer_class = InterviewSessionSerializer   
    #
    #def perform_create_xxx(self, serializer):
    #    self.logger.info("perform_create: inicio ")
    #    session = serializer.save()
    #
    #    jd = session.jd
    #    loader = DocumentLoaderService()
    #
    #    if jd.pdf_file:
    #        documents = loader.load_from_pdf(jd.pdf_file.path)
    #    elif jd.url:
    #        documents = loader.load_from_url(jd.url)
    #    else:
    #        documents = loader.load_from_text(jd.text_content)
    #
    #    memory = MemoryManager().get_memory()
    #
    #    # 🔥 TOOL OBLIGATORIA
    #    web_tool = WebSearchTool.get_tool()
    #    tools = [web_tool]
    #
    #    jd_template = AgentTemplate.objects.get(name="jd_agent")
    #
    #    jd_agent = JDAgent(
    #        AgentFactory.create(jd_template, tools, memory)
    #    )
    #    
    #    llm = LLMConfig.get_llm(
    #        jd_template.model_name,
    #        jd_template.temperature
    #    )
    #
    #    rag = RAGEngine(documents, llm)
    #
    #    # ------------------------
    #    # JD ANALYSIS
    #    # ------------------------
    #
    #    profile = jd_agent.extract_profile(jd.text_content)
    #
    #    enriched_profile = rag.query(f"Amplía este perfil: {profile}")
    #
    #    engine = self._build_engine(session)
    #
    #    first_question = engine.start(enriched_profile)
    #    self.logger.info("perform_create: fin ")
    #
    #    # 👉 en vez de dejar que el viewset devuelva el serializer por defecto,
    #    # devolvemos un Response con la sesión y la primera pregunta
    #    self.logger.info(f"SSSSSSSSSSSXXXX :: {session} - {session.id}")
    #    return Response({
    #        "session_id": session.id,  #InterviewSessionSerializer(session).data,
    #        "first_question": first_question
    #    }, status=status.HTTP_201_CREATED)
    #
    #def create(self, request, *args, **kwargs):
    #    self.logger.info("create: inicio ")
    #    serializer = self.get_serializer(data=request.data)
    #    serializer.is_valid(raise_exception=True)
    #    session = serializer.save()
    #
    #    # cargar JD y perfil enriquecido
    #    jd = session.jd
    #    loader = DocumentLoaderService()
    #    if jd.pdf_file:
    #        documents = loader.load_from_pdf(jd.pdf_file.path)
    #    elif jd.url:
    #        documents = loader.load_from_url(jd.url)
    #    else:
    #        documents = loader.load_from_text(jd.text_content)
    #
    #    memory = MemoryManager().get_memory()
    #    web_tool = WebSearchTool.get_tool()
    #    tools = [web_tool]
    #
    #    jd_template = AgentTemplate.objects.get(name="jd_agent")
    #    jd_agent = JDAgent(AgentFactory.create(jd_template, tools, memory))
    #    llm = LLMConfig.get_llm(jd_template.model_name, jd_template.temperature)
    #    rag = RAGEngine(documents, llm)
    #
    #    profile = jd_agent.extract_profile(jd.text_content)
    #    enriched_profile = rag.query(f"Amplía este perfil: {profile}")
    #
    #    engine = self._build_engine(session)
    #    #first_question = engine.start(enriched_profile)
    #    
    #    if (engine.start(enriched_profile)):
    #        payload = {
    #            "session_id": session.id
    #        }
    #    else:
    #        payload = {
    #            "session_id": -1
    #        }
    #
    #    self.logger.info("create: fin ")
    #
    #    return Response(payload, status=status.HTTP_201_CREATED)

        #return Response({
        #    "session_id": session.id,
        #    "first_question": first_question,
        #    "show_header": True
        #}, status=status.HTTP_201_CREATED)

    logger = logging.getLogger(__name__)
    serializer_class = InterviewSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Solo sesiones del usuario autenticado, ordenadas y limitadas
        #return InterviewSession.objects.filter(user=self.request.user).order_by("-created_at")[:10]
        #return InterviewSession.objects.filter(user=self.request.user)
        """
        Si la acción es 'list', limitamos a las 10 últimas.
        Para acciones de detalle, devolvemos todas las sesiones del usuario.
        """
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        
        qs = InterviewSession.objects.filter(user=self.request.user).order_by("-created_at")
        if self.action == "list":
            self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
            return qs[:10]
        
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin2 ")
        return qs

    def perform_create(self, serializer):
        self.logger.info("perform_create: inicio ")

        # Desactivar sesiones previas activas
        InterviewSession.objects.filter(user=self.request.user, is_active=True).update(is_active=False)

        # Crear nueva sesión activa
        session = serializer.save(user=self.request.user, is_active=True)

        # Aquí va tu lógica de JD, perfil enriquecido, motor, etc.
        jd = session.jd
        loader = DocumentLoaderService()
        if jd.pdf_file:
            documents = loader.load_from_pdf(jd.pdf_file.path)
        elif jd.url:
            documents = loader.load_from_url(jd.url)
        else:
            documents = loader.load_from_text(jd.text_content)

        memory = MemoryManager().get_memory()
        web_tool = WebSearchTool.get_tool()
        tools = [web_tool]

        jd_template = AgentTemplate.objects.get(name="jd_agent")
        jd_agent = JDAgent(AgentFactory.create(jd_template, tools, memory))
        llm = LLMConfig.get_llm(jd_template.model_name, jd_template.temperature)
        rag = RAGEngine(documents, llm)

        profile = jd_agent.extract_profile(jd.text_content)
        enriched_profile = rag.query(f"Amplía este perfil: {profile}")

        engine = self._build_engine(session)
        session.is_active = engine.start(enriched_profile)
        session.save()

        self.logger.info("perform_create: fin ")

    def create(self, request, *args, **kwargs):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        user = request.user  # Usuario autenticado
        self.logger.info(
            f"{inspect.currentframe().f_code.co_name}: inicio - usuario={user.id} ({user.username})"
        )
        # Usamos el flujo estándar de DRF y ajustamos la respuesta
        response = super().create(request, *args, **kwargs)
        session_id = response.data.get("id")
        payload = {"session_id": session_id if session_id else -1}
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        # Devuelve la sesión activa del usuario
        session = InterviewSession.objects.filter(user=request.user, is_active=True).first()
        if not session or session.has_expired():
            self.logger.info(f"{inspect.currentframe().f_code.co_name}: error inicio ")
            return Response({"error": "No hay sesión activa"}, status=404)
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        return Response(InterviewSessionSerializer(session).data)


    @action(detail=True, methods=["get"])
    def next_question(self, request, pk=None):
        self.logger.info("next_question: inicio ")
        session = self.get_object()

        engine = self._build_engine(session)

        question = engine.get_current_question()

        self.logger.info("next_question: fin ")

        #return Response(question)
        return Response({"result": question}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        self.logger.info("answer: inicio ")

        session = self.get_object()
        answer = request.data.get("answer")
        
        if not answer:
            return Response({"error": f"Debes enviar un campo 'answer' {answer}"}, status=400)

        engine = self._build_engine(session)

        result = engine.process_answer(answer)
        
        self.logger.info("answer: fin ")

        return Response({"result": result})

    def _build_engine(self, session):

        self.logger.info("_build_engine: inicio ")
        
        memory = MemoryManager().get_memory()
        tools = [WebSearchTool.get_tool()]

        jd = JDAgent(AgentFactory.create(
            AgentTemplate.objects.get(name="jd_agent"), tools, memory
        ))

        question = QuestionAgent(AgentFactory.create(
            AgentTemplate.objects.get(name="question_agent"), tools, memory
        ))

        evaluation = EvaluationAgent(AgentFactory.create(
            AgentTemplate.objects.get(name="evaluation_agent"), tools, memory
        ))

        report = ReportAgent(AgentFactory.create(
            AgentTemplate.objects.get(name="report_agent"), tools, memory
        ))

        cultural = CulturalAgent(AgentFactory.create(
            AgentTemplate.objects.get(name="cultural_agent"), tools, memory
        ))

        self.logger.info("_build_engine: fin ")

        return InterviewEngine(
            session,
            {
                "jd": jd,
                "question": question,
                "evaluation": evaluation,
                "report": report,
                "cultural": cultural
            },
            memory
        )
    
    @action(detail=True, methods=["get"])
    def result(self, request, pk=None):
        self.logger.info("result: inicio ")
        result = EvaluationResult.objects.filter(session_id=pk).last()
        if result is None:
            return Response({"error": "No hay evaluaciones para esta sesión"}, status=404)

        self.logger.info("result: fin ")

        return Response({
            "technical": result.technical_score,
            "communication": result.communication_score,
            "cultural": result.cultural_score,
            "report": result.report
        })
    
    @action(detail=True, methods=["get"])
    def answer_evaluation(self, request, pk=None):
        self.logger.info("answer_evaluation: inicio ")

        answers = AnswerEvaluation.objects.filter(session_id=pk).order_by("question_number")

        if answers is None:
            return Response({
                        "answer_evaluation": []
                    }, status=404)

        serializer = AnswerEvaluationSerializer(answers, many=True)

        self.logger.info("answer_evaluation: fin ")
        return Response({"answer_evaluation":serializer.data})

    @action(detail=True, methods=["get"])
    def chats(self, request, pk=None):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        #session = self.get_object()
        try:
            messages = ChatMessage.objects.filter(session_id=pk).order_by("id")
            if not messages.exists():
                return Response(
                    {"error": "No hay chats para esta sesión"},
                    status=status.HTTP_200_OK
                )
                
            serializer = ChatMessageSerializer(messages, many=True)
            self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
            return Response({"chat":serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            # Captura cualquier error inesperado
            return Response(
                {"error": f"Ocurrió un problema al obtener los chats: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )