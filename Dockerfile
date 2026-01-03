# Use the official Python bookworm image
FROM python:3.11-bookworm

# Set strict environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    HOME=/home/user \
    PATH="/home/user/.local/bin:$PATH" \
    PLAYWRIGHT_BROWSERS_PATH=/home/user/pw-browsers

# Create non-root user (Mandatory for Hugging Face)
RUN useradd -m -u 1000 user

# PRE-CREATE DIRECTORIES AS ROOT (The "Permission Denied" Fix)
# We create these BEFORE switching to the user to ensure the paths exist.
RUN mkdir -p /home/user/app/public/screenshots && \
    mkdir -p /home/user/pw-browsers && \
    chown -R user:user /home/user/app && \
    chown -R user:user /home/user/pw-browsers

WORKDIR /home/user/app

# INSTALL SYSTEM DEPS AS ROOT
# This installs the base libs + auto-detects missing Playwright dependencies.
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir playwright==1.49.0
RUN playwright install-deps chromium

# SWITCH TO NON-ROOT USER
USER user

# Install Python packages as 'user'
# Using --user and leveraging the pre-created app directory.
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Install Chromium binaries
RUN python3 -m playwright install chromium

# Copy application code
# Ensure all files are owned by the user.
COPY --chown=user . .

# Expose HF default port
EXPOSE 7860

# Start with Gunicorn + UvicornWorker
# Using --timeout 600 to allow for long-running AI missions.
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "worker_api:app", "--bind", "0.0.0.0:7860", "--timeout", "600", "--access-logfile", "-", "--error-logfile", "-"]
