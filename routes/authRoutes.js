const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function addAppName(user, appName) {
  let isNewAppAdded = false;

  if (appName && !user.appNames.includes(appName)) {
    user.appNames.push(appName);
    user.kc += 100;
    isNewAppAdded = true;
  }

  return isNewAppAdded;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, deviceId, appName } = req.body;

    if (!name || !email || !password || !deviceId || !appName) {
      return res.json({
        success: false,
        message: "Name, email, password, deviceId and appName are required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.json({
        success: false,
        message: "Invalid email address"
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const existingName = await User.findOne({ name });

    if (existingName) {
      return res.json({
        success: false,
        message: "Username already registered"
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });

    if (existingEmail) {
      return res.json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    deviceId,
    appNames: [appName],
    kc: 100,
    avatar:0
});

    return res.json({
      success: true,
      message: "Registration successful",
      userId: user._id,
      name: user.name,
      email:user.email,
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { name, password, appName } = req.body;

    if (!name || !password || !appName) {
      return res.json({
        success: false,
        message: "Name, password and appName are required"
      });
    }

    const user = await User.findOne({
      $or: [
        { name: name },
        { email: name.toLowerCase() }
      ]
    });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Wrong password"
      });
    }

    addAppName(user, appName);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      userId: user._id,
      name: user.name,
      email:user.email,
      token,
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.post("/me", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({
        success: false,
        message: "UserId required"
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "User data loaded",
      userId: user._id,
      name: user.name,
      email: user.email,
      token: "",
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.post("/check-device", async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.json({
        success: false,
        message: "DeviceId required"
      });
    }

    const user = await User.findOne({ deviceId });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found on this device"
      });
    }

    return res.json({
      success: true,
      message: "Account found on this device",
      userId: user._id,
      name: user.name,
      email: user.email,
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});



router.post("/confirm-device-login", async (req, res) => {
  try {
    const { deviceId, appName } = req.body;

    if (!deviceId || !appName) {
      return res.json({
        success: false,
        message: "DeviceId and appName required"
      });
    }

    const user = await User.findOne({ deviceId });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found on this device"
      });
    }

    if (!user.appNames.includes(appName)) {
      user.appNames.push(appName);
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      userId: user._id,
      name: user.name,
      email: user.email,
      token,
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.post("/device-login", async (req, res) => {
  try {
    const { deviceId, appName } = req.body;

    if (!deviceId || !appName) {
      return res.json({
        success: false,
        message: "DeviceId and appName are required"
      });
    }

    const user = await User.findOne({ deviceId });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found on this device"
      });
    }

    addAppName(user, appName);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Auto login successful",
      userId: user._id,
      name: user.name,
      token,
       kc: user.kc,
       avatar: user.avatar,
      appNames: user.appNames
    });

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;