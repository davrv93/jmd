FROM python:3.12-slim
RUN pip install --no-cache-dir onnxruntime==1.20.1 numpy==2.1.3 pillow==11.0.0
ADD https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx /modelo/isnet-general-use.onnx
RUN chmod 755 /modelo && chmod 644 /modelo/isnet-general-use.onnx
COPY app.py /app/app.py
USER nobody
EXPOSE 8000
CMD ["python", "/app/app.py"]
