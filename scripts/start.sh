screen -dmS webserver bash -c "
while true
do
  python3 main.py
  echo '=================='
  sleep 3
done
"