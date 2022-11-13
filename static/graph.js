var wrapper, canvas, ctx, table;

function httpRequest(url, callback) {
  let request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open("GET", url, true);
  request.send(null);
}

function init() {
  wrapper = document.getElementById("graph_wrapper");
  table = document.getElementById("stats_table");
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");

  wrapper.style.height = "200px";
  table.style.display = "block";
  wrapper.appendChild(canvas);
  document.getElementById("js_warning").remove();

  let url = "https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/stats/";
  categories = ["year", "month", "week", "day"];
  for (let i=0; i<categories.length; i++) {
    let category = categories[i];
    httpRequest(url+category, function() {
      let stats = JSON.parse(this.responseText);
      populateTable(i+1, stats, category);
      if (category == "month") {
        drawGraph(stats);
      }
    });
  }
}

function populateTable(col, stats, category) {
  let body = table.children[1].children;
  body[0].children[col].innerHTML = `${stats.total.toLocaleString()}/${category}`; 
  body[1].children[col].innerHTML = "#"+stats.rank.toLocaleString();
  body[2].children[col].innerHTML = "#"+stats.typeRank.toLocaleString();
}

function drawGraph(stats) {
  let dates = stats.branches.master.dates;
  let dateKeys = Object.keys(dates);
  let labels = [];
  let data = [];
  for (let i=0; i<dateKeys.length; i++) {
    let date = dateKeys[i];
    let dateSplit = date.split("-");
    labels.push(`${dateSplit[1]}/${dateSplit[2]}`);
    data.push(dates[date]);
  }
  
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "# of downloads",
        data: data,
        borderWidth: 1,
        borderColor: "#4C566A",
        pointBackgroundColor: "#4C566A",
        pointRadius: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            text: "Number of Downloads",
            display: true
          }
        }
      },
      plugins: {
        legend: {
          display: false,
        }
      }
    }
  });
}

window.onload = init;
