# How 2 run mirror on vm #

1. ```npm install``` 
2. ```npm run build:prod```
3. ```pm2 stop all``` 
4. ```pm2 delete all```
5. ```pm2 start "python3 server/main.py" --name edpuzzle-mirror```
6. ```pm2 save```
7. ```pm2 startup```

# DO NOT USE SUDO FOR THE COMMANDS ESPECIALLY PM2

### For Log ###

```pm2 logs edpuzzle-mirror```

### for restart ###

```pm2 restart edpuzzle-mirror```

remember to gitignore this file