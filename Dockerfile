# Use the official Python bookworm image
FROM python:3.11-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    HOME=/home/user \
    PATH="/home/user/.local/bin:$PATH"

# Install system dependencies for Playwright & Gunicorn
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Mandatory for Hugging Face)
RUN useradd -m -u 1000 user
USER user
WORKDIR $HOME/app

# Install Python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Install Playwright Chromium
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY --chown=user . .

# Expose HF default port
EXPOSE 7860

# Start with Gunicorn for "Never Sleeping" reliability
# -w 2: Two workers (Good for 2vCPU / 16GB RAM spaces)
# --timeout 300: Allow 5 mins for long Scout missions
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "worker_api:app", "--bind", "0.0.0.0:7860", "--timeout", "300"]
