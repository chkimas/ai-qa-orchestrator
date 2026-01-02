# Official Python bookworm image
FROM python:3.11-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    HOME=/home/user \
    PATH="/home/user/.local/bin:$PATH" \
    PLAYWRIGHT_BROWSERS_PATH=/home/user/pw-browsers

# Install system dependencies for Playwright
# Added 'libgles2' and 'libxkbcommon0' which are often missing on HF
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
    libgles2 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Mandatory for Hugging Face)
RUN useradd -m -u 1000 user
USER user
WORKDIR $HOME/app

# Pre-create browser directory for Playwright
RUN mkdir -p $HOME/pw-browsers

# Install Python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Install Playwright Chromium & Dependencies
# We install it specifically to our custom path to ensure permissions are clean
RUN python3 -m playwright install chromium
# We don't run install-deps here as we handle them in the apt-get block above

# Copy application code
COPY --chown=user . .

# Expose HF default port
EXPOSE 7860

# Start with Gunicorn + UvicornWorker
# -w 2: Two workers handles concurrent Sniper and Scout tasks well
# --timeout 600: Increased to 10 mins for deep Scout/Crawler missions
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "worker_api:app", "--bind", "0.0.0.0:7860", "--timeout", "600", "--access-logfile", "-", "--error-logfile", "-"]
