from django.contrib import admin
from .models import *

admin.site.register(AgentTemplate)
admin.site.register(JobDescription)
admin.site.register(InterviewSession)
admin.site.register(ChatMessage)
admin.site.register(EvaluationResult)
admin.site.register(AnswerEvaluation)
admin.site.register(User)