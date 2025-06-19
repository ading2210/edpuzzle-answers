screen -dmS webserver bash -c "
while true
do
  source .venv/bin/activate
  python3 server/main.py
  echo '=================='
  sleep 3
done
"