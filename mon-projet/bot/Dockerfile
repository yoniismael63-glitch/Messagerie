# ==============================================================================
# Dockerfile du Bot d'Escalade et de Suppléance Souverain - FasoMatrix (Jour 3)
# ==============================================================================
# Image officielle Python 3.12 slim
# Aucun accès réseau externe pendant l'exécution (réseau interne matrix_internal)
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY escalation_bot.py .

CMD ["python", "escalation_bot.py"]
