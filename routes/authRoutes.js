const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/*
 * Kisi app ki existing reward value me KC add karega.
 * Agar appRewards me app nahi hai to new entry banayega.
 */
function addKCToApp(user, appName, rewardKC) {
  if (!appName || typeof appName !== "string") {
    return false;
  }

  const cleanAppName = appName.trim();
  const cleanRewardKC = Number(rewardKC);

  if (!cleanAppName) {
    return false;
  }

  if (!Number.isFinite(cleanRewardKC) || cleanRewardKC <= 0) {
    return false;
  }

  if (!Array.isArray(user.appRewards)) {
    user.appRewards = [];
  }

  if (typeof user.kc !== "number") {
    user.kc = 0;
  }

  const existingReward = user.appRewards.find(
    reward =>
      reward.appName &&
      reward.appName.trim().toLowerCase() ===
        cleanAppName.toLowerCase()
  );

  if (existingReward) {
    existingReward.kcEarned =
      Number(existingReward.kcEarned || 0) +
      cleanRewardKC;
  } else {
    user.appRewards.push({
      appName: cleanAppName,
      kcEarned: cleanRewardKC,
      linkedAt: new Date()
    });
  }

  user.kc += cleanRewardKC;

  return true;
}

/*
 * New app link karega aur first time 100 KC dega.
 */
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
      linkedApp &&
      linkedApp.trim().toLowerCase() ===
        cleanAppName.toLowerCase()
  );

  if (alreadyLinked) {
    return false;
  }

  user.appNames.push(cleanAppName);

  // New app link reward
  addKCToApp(user, cleanAppName, 100);

  return true;
}

/*
 * REGISTER
 */
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      deviceId,
      appName
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !deviceId ||
      !appName
    ) {
      return res.json({
        success: false,
        message:
          "Name, email, password, deviceId and appName are required"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanAppName = appName.trim();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.json({
        success: false,
        message: "Invalid email address"
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message:
          "Password must be at least 6 characters"
      });
    }

    const existingName = await User.findOne({
      name: cleanName
    });

    if (existingName) {
      return res.json({
        success: false,
        message: "Username already registered"
      });
    }

    const existingEmail = await User.findOne({
      email: cleanEmail
    });

    if (existingEmail) {
      return res.json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const firstAppReward = 100;

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      deviceId,

      appNames: [
        cleanAppName
      ],

      appRewards: [
        {
          appName: cleanAppName,
          kcEarned: firstAppReward,
          linkedAt: new Date()
        }
      ],

      kc: firstAppReward,
      avatar: 0,
      ca: false
    });

    return res.json({
      success: true,
      message: "Registration successful",
      userId: user._id,
      name: user.name,
      email: user.email,
      kc: user.kc,
      avatar: user.avatar,
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

/*
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const {
      name,
      password,
      appName
    } = req.body;

    if (!name || !password || !appName) {
      return res.json({
        success: false,
        message:
          "Name, password and appName are required"
      });
    }

    const cleanLoginName = name.trim();

    const user = await User.findOne({
      $or: [
        {
          name: cleanLoginName
        },
        {
          email: cleanLoginName.toLowerCase()
        }
      ]
    });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Wrong password"
      });
    }

    const isNewAppAdded =
      addAppName(user, appName);

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
        : "Login successful",

      userId: user._id,
      name: user.name,
      email: user.email,
      token,
      kc: user.kc,
      avatar: user.avatar,
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards,
      isNewAppAdded
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

/*
 * GET USER DATA
 */
router.post("/me", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({
        success: false,
        message: "UserId required"
      });
    }

    const user = await User
      .findById(userId)
      .select("-password");

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
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

/*
 * CHECK DEVICE
 */
router.post("/check-device", async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.json({
        success: false,
        message: "DeviceId required"
      });
    }

    const user = await User.findOne({
      deviceId
    });

    if (!user) {
      return res.json({
        success: false,
        message:
          "No account found on this device"
      });
    }

    return res.json({
      success: true,
      message:
        "Account found on this device",
      userId: user._id,
      name: user.name,
      email: user.email,
      kc: user.kc,
      avatar: user.avatar,
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards
    });
  } catch (error) {
    console.error("Check device error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

/*
 * CONFIRM DEVICE LOGIN
 */
router.post(
  "/confirm-device-login",
  async (req, res) => {
    try {
      const {
        deviceId,
        appName
      } = req.body;

      if (!deviceId || !appName) {
        return res.json({
          success: false,
          message:
            "DeviceId and appName required"
        });
      }

      const user = await User.findOne({
        deviceId
      });

      if (!user) {
        return res.json({
          success: false,
          message:
            "No account found on this device"
        });
      }

      const isNewAppAdded =
        addAppName(user, appName);

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
        ca: user.ca,
        appNames: user.appNames,
        appRewards: user.appRewards,
        isNewAppAdded
      });
    } catch (error) {
      console.error(
        "Confirm device login error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
);

/*
 * DEVICE LOGIN
 */
router.post(
  "/device-login",
  async (req, res) => {
    try {
      const {
        deviceId,
        appName
      } = req.body;

      if (!deviceId || !appName) {
        return res.json({
          success: false,
          message:
            "DeviceId and appName are required"
        });
      }

      const user = await User.findOne({
        deviceId
      });

      if (!user) {
        return res.json({
          success: false,
          message:
            "No account found on this device"
        });
      }

      const isNewAppAdded =
        addAppName(user, appName);

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
          : "Auto login successful",

        userId: user._id,
        name: user.name,
        email: user.email,
        token,
        kc: user.kc,
        avatar: user.avatar,
        ca: user.ca,
        appNames: user.appNames,
        appRewards: user.appRewards,
        isNewAppAdded
      });
    } catch (error) {
      console.error(
        "Device login error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
);

/*
 * UPDATE PROFILE
 */
router.post(
  "/update-profile",
  async (req, res) => {
    try {
      const {
        userId,
        name,
        avatar
      } = req.body;

      if (!userId) {
        return res.json({
          success: false,
          message: "UserId is required"
        });
      }

      const cleanName =
        typeof name === "string"
          ? name.trim()
          : "";

      if (!cleanName) {
        return res.json({
          success: false,
          message: "Name is required"
        });
      }

      const cleanAvatar =
        Number(avatar);

      if (
        !Number.isInteger(cleanAvatar) ||
        cleanAvatar < 0
      ) {
        return res.json({
          success: false,
          message: "Invalid avatar"
        });
      }

      const user =
        await User.findById(userId);

      if (!user) {
        return res.json({
          success: false,
          message: "User not found"
        });
      }

      const duplicateName =
        await User.findOne({
          name: cleanName,
          _id: {
            $ne: userId
          }
        });

      if (duplicateName) {
        return res.json({
          success: false,
          message:
            "Username already registered"
        });
      }

      user.name = cleanName;
      user.avatar = cleanAvatar;
      user.ca = true;

      await user.save();

      return res.json({
        success: true,
        message:
          "Profile updated successfully",
        userId: user._id,
        name: user.name,
        email: user.email,
        kc: user.kc,
        avatar: user.avatar,
        ca: user.ca,
        appNames: user.appNames,
        appRewards: user.appRewards
      });
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
);

// Add KC
router.post("/add-kc", async (req, res) => {
  try {
    const {
      userId,
      appName,
      rewardKC
    } = req.body;

    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required"
      });
    }

    if (
      !appName ||
      typeof appName !== "string" ||
      !appName.trim()
    ) {
      return res.json({
        success: false,
        message: "AppName is required"
      });
    }

    const cleanRewardKC =
      Number(rewardKC);

    if (
      !Number.isFinite(cleanRewardKC) ||
      cleanRewardKC <= 0
    ) {
      return res.json({
        success: false,
        message:
          "RewardKC must be greater than 0"
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const added =
      addKCToApp(
        user,
        appName,
        cleanRewardKC
      );

    if (!added) {
      return res.json({
        success: false,
        message: "KC could not be added"
      });
    }

    await user.save();

    return res.json({
      success: true,
      message:
        `${cleanRewardKC} KC added successfully`,
      userId: user._id,
      name: user.name,
      email: user.email,
      kc: user.kc,
      avatar: user.avatar,
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards,
      addedKC: cleanRewardKC,
      rewardedApp: appName.trim()
    });
  } catch (error) {
    console.error("Add KC error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;