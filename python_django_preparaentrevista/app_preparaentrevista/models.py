from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

class User(AbstractUser):
    # Puedes extender con más campos si lo necesitas
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.username

class AgentTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    system_prompt = models.TextField()
    temperature = models.FloatField(default=0.2)
    model_name = models.CharField(max_length=100, default="gpt-4o-mini")

    def __str__(self):
        return self.name


class JobDescription(models.Model):
    title = models.CharField(max_length=255)
    text_content = models.TextField(blank=True, null=True)
    pdf_file = models.FileField(upload_to="jd_pdfs/", blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    app_name = models.CharField(max_length=50, blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)


class InterviewSession(models.Model):
    jd = models.ForeignKey(JobDescription, on_delete=models.CASCADE)
    session_name = models.CharField(max_length=50, blank=False, null=False) 
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True) # Flag que indica si la sessión está activa o no (debe de existir una sola sessión activa por usuario)
    current_question_index = models.IntegerField(default=0)
    # batería de preguntas generadas
    questions = models.JSONField(default=list, null=False, blank=True)
    # scoring acumulado
    score_data = models.JSONField(default=dict, null=False, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions", null=True)
    is_close = models.BooleanField(default=False) # Flag que indica si la sessión esta cerrada (se cierra cuando se respponden todas las preguntas)
    expires_at = models.DateTimeField(null=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            duration = getattr(settings, "SESSION_DURATION_HOURS", 4)
            self.expires_at = timezone.now() + timedelta(hours=duration)
        super().save(*args, **kwargs)

    def has_expired(self):
        return timezone.now() > self.expires_at
    

class ChatMessage(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE)
    role = models.CharField(max_length=20)
    question_number = models.IntegerField(default=0)
    order = models.IntegerField(default=0)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    reply_to = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)


class EvaluationResult(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE)
    technical_score = models.FloatField()
    communication_score = models.FloatField()
    cultural_score = models.FloatField()
    report = models.TextField()

class AnswerEvaluation(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE)
    question_number = models.IntegerField(default=0)
    type = models.CharField(max_length=20, blank=True, null=True, default='')
    question = models.TextField()
    answer = models.TextField()
    evaluation = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)