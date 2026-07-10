const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function addAppName(user, appName) {
  if (!appName || typeof appName !== "string") {
    return false;
  }

  const cleanAppName = appName.trim();

  if (!cleanAppName) {
    return false;
  }

  if (!Array.isArray(user.appNames)) {
    user.appNames = [];
  }

  if (!Array.isArray(user.appRewards)) {
    user.appRewards = [];
  }

  if (typeof user.kc !== "number") {
    user.kc = 0;
  }

  const alreadyLinked = user.appNames.some(
    linkedApp =>
      linkedApp.trim().toLowerCase() ===
      cleanAppName.toLowerCase()
  );

  if (alreadyLinked) {
    return false;
  }

  const rewardKC = 100;

  user.appNames.push(cleanAppName);

  user.appRewards.push({
    appName: cleanAppName,
    kcEarned: rewardKC,
    linkedAt: new Date()
  });

  user.kc += rewardKC;

  return true;
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

   const cleanAppName = appName.trim();
const firstAppReward = 100;

const user = await User.create({
  name: name.trim(),
  email: email.toLowerCase().trim(),
  password: hashedPassword,
  deviceId,
  appNames: [cleanAppName],

  appRewards: [
    {
      appName: cleanAppName,
      kcEarned: firstAppReward,
      linkedAt: new Date()
    }
  ],

  kc: firstAppReward,
  avatar: 0
});

   return res.json({
  success: true,
  message: "Registration successful",
  userId: user._id,
  name: user.name,
  email: user.email,
  kc: user.kc,
  avatar: user.avatar,
  appNames: user.appNames,
  appRewards: user.appRewards
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

    const isNewAppAdded = addAppName(user, appName);

if (isNewAppAdded) {
  await user.save();
}
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
  success: true,
  message: isNewAppAdded
    ? "New app linked. You received 100 KC."
    : "Login successful",
  userId: user._id,
  name: user.name,
  email: user.email,
  token,
  kc: user.kc,
  avatar: user.avatar,
  appNames: user.appNames,
  appRewards: user.appRewards,
  isNewAppAdded
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
       appRewards: user.appRewards
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
      appRewards: user.appRewards,
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

    const isNewAppAdded = addAppName(user, appName);

    if (isNewAppAdded) {
      await user.save();
    }

    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.json({
      success: true,
      message: isNewAppAdded
        ? "New app linked. You received 100 KC."
        : "Login successful. App already linked.",
      userId: user._id,
      name: user.name,
      email: user.email,
      token,
      kc: user.kc,
      avatar: user.avatar,
      appNames: user.appNames,
      appRewards: user.appRewards,
      isNewAppAdded
    });

  } catch (error) {
    console.error("Confirm device login error:", error);

    return res.status(500).json({
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

    const isNewAppAdded = addAppName(user, appName);

if (isNewAppAdded) {
  await user.save();
}

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
  success: true,
  message: isNewAppAdded
    ? "New app linked. You received 100 KC."
    : "Auto login successful",
  userId: user._id,
  name: user.name,
  email: user.email,
  token,
  kc: user.kc,
  avatar: user.avatar,
  appNames: user.appNames,
  isNewAppAdded
});

  } catch (error) {
    return res.json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


router.post("/update-profile", async (req, res) => {
  try {
    const { userId, name, avatar } = req.body;

    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required"
      });
    }

    const cleanName =
      typeof name === "string" ? name.trim() : "";

    if (!cleanName) {
      return res.json({
        success: false,
        message: "Name is required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const duplicateName = await User.findOne({
      name: cleanName,
      _id: { $ne: userId }
    });

    if (duplicateName) {
      return res.json({
        success: false,
        message: "Username already registered"
      });
    }

    user.name = cleanName;
    user.avatar = avatar;

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
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

module.exports = router;