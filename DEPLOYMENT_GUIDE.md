<!-- 
for delete with volume
<!-- docker compose down -v -->

docker log check 
docker compose logs backend
docker compose logs mongo

mongo 
 docker compose exec mongo mongosh -u USERNAME -p 'PASSWORD' --authenticationDatabase admin
🚀 Now On Your Server 

# Backend
docker build -t keyurp0207/support-backend:latest ./support-backend

# Frontend
docker build -t keyurp0207/support-frontend:latest ./support-frontend

docker push keyurp0207/support-backend:latest
docker push keyurp0207/support-frontend:latest
----

sass-app/
│
├── docker-compose.yml
└── .env.production

Then run:

docker login
docker compose pull
docker compose up -d
<!-- docker compose --env-file .env.production up -d -->

//then run single time 
1 START DOCKER DESKTOP 
GO TO ROOT LEVEL where docker compose located 
2 docker compose exec backend npm run seed
3 docker compose exec backend npm run saas:seed
4
docker compose up -d


//---connect to mongo using 
<!--mongodb://localhost:27018/ -->