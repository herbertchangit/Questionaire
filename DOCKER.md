# Docker Setup

Run the full app with frontend, backend, and MongoDB:

```bash
docker compose up --build
```

Open the app:

```text
http://localhost:8081
```

Backend API is also exposed for debugging:

```text
http://localhost:8000/docs
```

Seed demo data and users:

```bash
docker compose --profile seed run --rm seed
```

Demo accounts after seeding:

```text
demo / demo123
admin / admin123
```

MongoDB data is stored in the `mongo_data` Docker volume.
