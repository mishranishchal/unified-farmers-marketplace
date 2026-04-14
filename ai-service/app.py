from flask import Flask
from routes.predict import predict_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

    @app.get("/health")
    def health():
        return {"success": True, "data": {"status": "ok"}, "message": "AI service healthy"}, 200

    app.register_blueprint(predict_bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
