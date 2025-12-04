FROM python:3.13.5-slim
WORKDIR /app

# Install uv v0.9.13 (pinned version)
COPY --from=ghcr.io/astral-sh/uv:0.9.15 /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen

# Copy app code
COPY . .

EXPOSE 5001

CMD ["uv", "run", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "5001"]
