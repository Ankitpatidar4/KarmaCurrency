const express = require("express");
const App = require("../models/App");

const router = express.Router();

router.get("/list", async (req, res) => {
  try {
    const apps = await App.find({
      isActive: true
    })
      .sort({ createdAt: -1 })
      .select("_id appName appUrl appIcon appDetail");

    return res.status(200).json({
      success: true,
      message: "App list loaded successfully",
      totalApps: apps.length,
      apps: apps.map((app) => ({
        appId: app._id.toString(),
        appName: app.appName,
        appUrl: app.appUrl,
        dl:app.dl,
        appIcon: app.appIcon,
        appDetail: app.appDetail
      }))
    });
  } catch (error) {
    console.error("Get app list error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      totalApps: 0,
      apps: [],
      error: error.message
    });
  }
});

module.exports = router;