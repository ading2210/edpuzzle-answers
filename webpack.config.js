const path = require("path");

const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./app/main.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "app/html", to: "" },
        { from: "app/css", to: "styles" },
        { from: "script.js", to: ""},
        { from: "open.js", to: ""},
        { from: "landing", to: "landing"}
      ],
    }),
  ],
};
