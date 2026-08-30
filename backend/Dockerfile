# Use CUDA-enabled base image for GPU acceleration
# Use nvidia/cuda base with Python 3.11
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python3
RUN ln -sf /usr/bin/python3.11 /usr/bin/python && ln -sf /usr/bin/python3.11 /usr/bin/python3

WORKDIR /app

# Install pip
RUN python3 -m ensurepip --upgrade && python3 -m pip install --no-cache-dir --upgrade pip

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create output directory
RUN mkdir -p static/outputs

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]