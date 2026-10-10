const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { firebaseAuth} = require("../config/firebaseAdmin");
const avatarFrames = require("../config/avatarFrames");
const DEFAULT_FRAME_ID = "frame_0";
const {karmaRanks,getRankData} = require("../config/karmaRanks");
const router = express.Router();
function requireKarmaUser(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Login token is required"
    });
  }
  let decoded;
  try {
    decoded = jwt.verify(
      header.slice(7).trim(),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again."
    });
  }
  const userId = String(decoded.userId || "");
  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
    return res.status(401).json({
      success: false,
      message: "Invalid token user"
    });
  }
  if (req.body && req.body.userId &&
      req.body.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: "Account mismatch"
    });
  }
  req.karmaUserId = userId;
  return next();
}
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
      ca: false,
      isLoggedIn : true,
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
      appRewards: user.appRewards,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
    const isNewAppAdded = addAppName(user, appName);
    user.isLoggedIn = true;
     await user.save();
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
      isNewAppAdded,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
      appRewards: user.appRewards,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
      message: "Account found on this device",
      isLoggedIn: user.isLoggedIn,
      requireLogin: !user.isLoggedIn,
      userId: user._id,
      name: user.name,
      email: user.email,
      kc: user.kc,
      avatar: user.avatar,
      ca: user.ca,
      appNames: user.appNames,
      appRewards: user.appRewards,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
      if (!user.isLoggedIn) {
        return res.json({
          success: false,
          message: "User logged out. Manual login required.",
          requireLogin: true
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
        isNewAppAdded,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
      if (!user.isLoggedIn) {
       return res.json({
       success: false,
       message: "User is logged out. Please login manually.",
       requireLogin: true
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
        isNewAppAdded,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
router.post("/update-profile", async (req, res) => {
  try {
    const {
      userId,
      name,
      avatar,
      selectedFrameId
    } = req.body;
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required"
      });
    }
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (cleanName.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 3 characters"
      });
    }
    if (
      typeof avatar !== "number" ||
      !Number.isInteger(avatar) ||
      avatar < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid avatar"
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    // Older clients frame field na bheje to existing selection retain karo.
    const frameId = selectedFrameId === undefined
      ? getSelectedFrameId(user)
      : selectedFrameId;
    const frame = avatarFrames.find(
      item => item.frameId === frameId
    );
    if (!frame || !frame.isActive) {
      return res.status(400).json({
        success: false,
        message: "Selected frame is unavailable"
      });
    }
    if (!getUnlockedFrameIds(user).includes(frameId)) {
      return res.status(400).json({
        success: false,
        message: "Unlock this frame before selecting it"
      });
    }
    const duplicateName = await User.findOne({
      name: cleanName,
      _id: { $ne: userId }
    });
    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Username already registered"
      });
    }
    user.name = cleanName;
    user.avatar = avatar;
    user.selectedFrameId = frameId;
    user.ca = true;
    await user.save();
    return res.json(
      profileResponse(user, "Profile updated successfully")
    );
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000
        ? "Username already registered"
        : "Unable to update profile"
    });
  }
});
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
      rewardedApp: appName.trim(),
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
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
router.post(
  "/google-login",
  async (req, res) => {
    try {
      const {
        firebaseIdToken,
        deviceId,
        appName
      } = req.body;
      console.log(
        "Google Login Request:",
        {
          deviceId,
          appName,
          hasFirebaseToken:
            !!firebaseIdToken
        }
      );
      if (!firebaseIdToken) {
        return res.json({
          success: false,
          message:
            "Firebase ID Token is required"
        });
      }
      if (!appName) {
        return res.json({
          success: false,
          message:
            "AppName is required"
        });
      }
      const decodedToken =
        await firebaseAuth.verifyIdToken(
          firebaseIdToken
        );
      console.log(
        "Firebase Token Verified:",
        {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name
        }
      );
      if (
        !decodedToken.firebase ||
        decodedToken.firebase.sign_in_provider !==
          "google.com"
      ) {
        return res.json({
          success: false,
          message:
            "This token is not from Google Sign-In"
        });
      }
      const googleId =
        decodedToken.uid;
      const email =
        decodedToken.email
          ? decodedToken.email
              .toLowerCase()
              .trim()
          : "";
      const nameFromGoogle =
        decodedToken.name ||
        (
          email
            ? email.split("@")[0]
            : "Karma User"
        );
      if (!email) {
        return res.json({
          success: false,
          message:
            "Google account email not available"
        });
      }
      let user =
        await User.findOne({
          googleId
        });
      let isNewUser = false;
      if (!user) {
        user =
          await User.findOne({
            email
          });
      }
      if (!user) {
        let finalName =
          nameFromGoogle.trim();
        if (!finalName) {
          finalName =
            "Karma User";
        }
        let nameExists =
          await User.findOne({
            name: finalName
          });
        if (nameExists) {
          finalName =
            finalName +
            "_" +
            Math.floor(
              1000 +
              Math.random() * 9000
            );
        }
        user =
          new User({
            name: finalName,
            email: email,
            password:
              await bcrypt.hash(
                Math.random()
                  .toString(36) +
                Date.now(),
                10
              ),
            deviceId:
              deviceId || "",
            appNames: [],
            appRewards: [],
            kc: 0,
            ca: false,
            avatar: 0,
            googleId: googleId
          });
        isNewUser = true;
      } else {
        user.googleId =
          googleId;
        if (
          deviceId &&
          !user.deviceId
        ) {
          user.deviceId =
            deviceId;
        }
      }
      if (
        deviceId &&
        user.deviceId !== deviceId
      ) {
        user.deviceId =
          deviceId;
      }
      const isNewAppAdded =  addAppName(user,appName);
      user.isLoggedIn = true;
      await user.save();
      const token =
        jwt.sign(
          {
            userId: user._id,
            name: user.name
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d"
          }
        );
      console.log(
        "Google Login Success:",
        {
          userId:
            user._id.toString(),
          name:
            user.name,
          email:
            user.email,
          appName,
          isNewUser,
          isNewAppAdded,
          kc:
            user.kc
        }
      );
      return res.json({
        success: true,
        message:
          isNewUser
            ? "Google account registered successfully"
            : "Google login successful",
        userId:
          user._id,
        name:
          user.name,
        email:
          user.email,
        token,
        kc:
          user.kc,
        avatar:
          user.avatar,
        ca:
          user.ca,
        isNewAppAdded,
        appNames:
          user.appNames,
        appRewards:
          user.appRewards,
      selectedFrameId : user.selectedFrameId,
      ...getRankData(user.xp || 0)
      });
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );
      return res.status(401).json({
        success: false,
        message:
          "Google authentication failed",
        error:
          error.message
      });
    }
  }
);
router.post("/logout", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required"
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }
    // IMPORTANT
    user.isLoggedIn = false;
    await user.save();
    return res.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
// AvatarFrames
function getUnlockedFrameIds(user) {
  return [
    ...new Set([
      DEFAULT_FRAME_ID,
      ...(user.unlockedFrameIds || [])
    ])
  ];
}
function getSelectedFrameId(user) {
  return user.selectedFrameId || DEFAULT_FRAME_ID;
}
function profileResponse(user, message) {
  return {
    success: true,
    message,
    userId: user._id,
    name: user.name,
    email: user.email,
    kc: user.kc,
    avatar: user.avatar,
    ca: user.ca,
    appNames: user.appNames,
    appRewards: user.appRewards,
    selectedFrameId: getSelectedFrameId(user),
    unlockedFrameIds: getUnlockedFrameIds(user),
    ...getRankData(user.xp || 0),
    ...getKarmaLedger(user)
  };
}
function isValidUserId(userId) {
  return typeof userId === "string" &&
    /^[a-fA-F0-9]{24}$/.test(userId);
}
// GET ALL FRAMES WITH USER STATUS
router.post("/avatar-frames", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required"
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const unlockedFrameIds = getUnlockedFrameIds(user);
    const selectedFrameId = getSelectedFrameId(user);
    const frames = avatarFrames.map(frame => ({
      frameId: frame.frameId,
      frameName: frame.frameName,
      unlockKC: frame.unlockKC,
      isActive: frame.isActive,
      isLocked: !unlockedFrameIds.includes(frame.frameId),
      isSelected: selectedFrameId === frame.frameId
    }));
    return res.json({
      success: true,
      message: "Avatar frames loaded",
      kc: user.kc,
      selectedFrameId,
      unlockedFrameIds,
      totalFrames: frames.length,
      lockedFrames: frames.filter(frame => frame.isLocked).length,
      unlockedFrames: frames.filter(frame => !frame.isLocked).length,
      activeFrames: frames.filter(frame => frame.isActive).length,
      frames
    });
  } catch (error) {
    console.error("Avatar frames error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load avatar frames"
    });
  }
});
// UNLOCK FRAME — SERVER DECIDES PRICE
router.post("/unlock-avatar-frame", requireKarmaUser, async (req, res) => {
  try {
    const userId = req.karmaUserId;
    const { frameId } = req.body;
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required"
      });
    }
    const frame = avatarFrames.find(
      item => item.frameId === frameId
    );
    if (!frame || !frame.isActive) {
      return res.status(400).json({
        success: false,
        message: "Frame is unavailable"
      });
    }
    if (!Number.isSafeInteger(frame.unlockKC) || frame.unlockKC < 0) {
      return res.status(500).json({ success: false, message: "Invalid frame price configuration" });
    }
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (getUnlockedFrameIds(existingUser).includes(frameId)) {
      return res.json(
        profileResponse(existingUser, "Frame is already unlocked")
      );
    }
    // Balance deduction aur unlock ek atomic operation hain.
    // Repeated requests same frame ke liye double charge nahi karengi.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        kc: { $gte: frame.unlockKC },
        unlockedFrameIds: { $ne: frameId }
      },
      {
        $inc: { kc: -frame.unlockKC, __v: 1 },
        $addToSet: { unlockedFrameIds: frameId },
        $push: {
          karmaDeductions: {
            requestId: "FRAME_UNLOCK:" + frameId,
            scope: "GLOBAL",
            appName: "",
            amount: frame.unlockKC,
            reason: "Avatar frame unlock: " + frame.frameName,
            itemId: frameId,
            createdAt: new Date()
          }
        }
      },
      {
        new: true,
        runValidators: true
      }
    );
    if (!updatedUser) {
      const latestUser = await User.findById(userId);
      if (!latestUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      if (getUnlockedFrameIds(latestUser).includes(frameId)) {
        return res.json(
          profileResponse(latestUser, "Frame is already unlocked")
        );
      }
      return res.status(400).json({
        success: false,
        message: `You need ${frame.unlockKC} KC to unlock this frame`
      });
    }
    return res.json(
      profileResponse(updatedUser, "Frame unlocked successfully")
    );
  } catch (error) {
    console.error("Unlock frame error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to unlock frame"
    });
  }
});
// Karma Rank
router.post("/karma-ranks", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required"
      });
    }

    const user = await User.findById(userId)
      .select("kc xp")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const rankData = getRankData(user.xp || 0);

    const ranks = karmaRanks.map(item => ({
      rank: item.rank,
      totalRanks: karmaRanks.length,
      rankText: `${item.rank} of ${karmaRanks.length}`,
      requiredXP: item.requiredXP,
      isAchieved: rankData.xp >= item.requiredXP,
      isCurrent: rankData.rank === item.rank
    }));

    return res.json({
      success: true,
      message: "XP rank loaded",
      userId: user._id,

      kc: user.kc,

      ...rankData,
      ranks
    });
  } catch (error) {
    console.error("XP rank error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load XP rank"
    });
  }
});

router.post(
  "/add-xp",
  requireKarmaUser,
  async (req, res) => {
    try {
      const userId = req.karmaUserId;
      const { rewardXP } = req.body;

      if (
        typeof rewardXP !== "number" ||
        !Number.isSafeInteger(rewardXP) ||
        rewardXP <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "rewardXP must be a positive integer"
        });
      }

      // Atomic increment: parallel requests increments overwrite nahi karengi.
      const user = await User.findOneAndUpdate(
        { _id: userId },
        {
          $inc: {
            xp: rewardXP,
            __v: 1
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.json({
        ...profileResponse(user, `${rewardXP} XP added successfully`),
        addedXP: rewardXP
      });
    } catch (error) {
      console.error("Add XP error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to add XP"
      });
    }
  }
);


router.post(
  "/subtract-kc",
  requireKarmaUser,
  async (req, res) => {
    try {
      const userId = req.karmaUserId;
      const {
        appName,
        subtractKC,
        reason,
        requestId
      } = req.body;
      const cleanAppName =
        typeof appName === "string" ? appName.trim() : "";
      const cleanReason =
        typeof reason === "string" ? reason.trim() : "";
      if (!cleanAppName || cleanAppName.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Valid appName is required"
        });
      }
      if (
        typeof subtractKC !== "number" ||
        !Number.isSafeInteger(subtractKC) ||
        subtractKC <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "subtractKC must be a positive integer"
        });
      }
      if (!cleanReason || cleanReason.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Deduction reason is required"
        });
      }
      if (
        typeof requestId !== "string" ||
        !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid requestId is required"
        });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      // Existing account me app ka stored spelling use karo.
      const knownNames = [
        ...(user.appNames || []),
        ...(user.appRewards || []).map(item => item.appName)
      ];
      const storedAppName = knownNames.find(name =>
        typeof name === "string" &&
        name.trim().toLowerCase() === cleanAppName.toLowerCase()
      );
      const deductionAppName = storedAppName
        ? storedAppName.trim()
        : cleanAppName;
      function replyIfProcessed(latestUser) {
        const existing = (latestUser.karmaDeductions || [])
          .find(item => item.requestId === requestId);
        if (!existing)
          return false;
        const sameRequest =
          existing.scope === "APP" &&
          existing.appName.toLowerCase() ===
            deductionAppName.toLowerCase() &&
          existing.amount === subtractKC &&
          existing.reason === cleanReason;
        if (!sameRequest) {
          res.status(409).json({
            success: false,
            message: "Request ID already used for another deduction"
          });
        } else {
          res.json({
            ...profileResponse(latestUser, "Deduction already processed"),
            deductedApp: existing.appName,
            deductedKC: existing.amount,
            deductionReason: existing.reason,
            requestId,
            alreadyProcessed: true
          });
        }
        return true;
      }
      if (replyIfProcessed(user))
        return;
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          kc: { $gte: subtractKC },
          "karmaDeductions.requestId": { $ne: requestId }
        },
        {
          $inc: {
            kc: -subtractKC,
            __v: 1
          },
          $push: {
            karmaDeductions: {
              requestId,
              scope: "APP",
              appName: deductionAppName,
              amount: subtractKC,
              reason: cleanReason,
              // Existing schema me itemId required hai.
              // Generic deduction ke liye requestId use kar rahe hain.
              itemId: requestId,
              createdAt: new Date()
            }
          }
        },
        {
          new: true,
          runValidators: true
        }
      );
      if (!updatedUser) {
        const latestUser = await User.findById(userId);
        if (!latestUser) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
        if (replyIfProcessed(latestUser))
          return;
        return res.status(400).json({
          success: false,
          message: "Not enough Karma",
          kc: latestUser.kc,
          requiredKC: subtractKC
        });
      }
      return res.json({
        ...profileResponse(
          updatedUser,
          `${subtractKC} KC deducted successfully`
        ),
        deductedApp: deductionAppName,
        deductedKC: subtractKC,
        deductionReason: cleanReason,
        requestId,
        alreadyProcessed: false
      });
    } catch (error) {
      console.error("Subtract KC error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to deduct Karma"
      });
    }
  }
);
function getKarmaLedger(user) {
  const apps = new Map();
  function getApp(appName) {
    const name = String(appName || "").trim();
    const key = name.toLowerCase();
    if (!apps.has(key)) apps.set(key, { appName: name, kcEarned: 0, kcSpent: 0 });
    return apps.get(key);
  }
  for (const reward of user.appRewards || []) {
    getApp(reward.appName).kcEarned += Number(reward.kcEarned || 0);
  }
  const deductions = (user.karmaDeductions || []).map(item => ({
    requestId: item.requestId, scope: item.scope, appName: item.appName || "",
    amount: Number(item.amount || 0), reason: item.reason,
    itemId: item.itemId, createdAt: item.createdAt
  }));
  let appSpentKC = 0;
  let globalSpentKC = 0;
  for (const item of deductions) {
    if (item.scope === "APP") {
      getApp(item.appName).kcSpent += item.amount;
      appSpentKC += item.amount;
    } else if (item.scope === "GLOBAL") {
      globalSpentKC += item.amount;
    }
  }
  deductions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    appLedger: [...apps.values()].sort((a, b) => b.kcEarned - a.kcEarned),
    appSpentKC, globalSpentKC, totalSpentKC: appSpentKC + globalSpentKC,
    karmaDeductions: deductions
  };
}
router.post("/karma-ledger", requireKarmaUser, async (req, res) => {
  try {
    const user = await User.findById(req.karmaUserId)
      .select("kc appRewards karmaDeductions").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({
      success: true, message: "Karma ledger loaded", userId: user._id,
      kc: user.kc, ...getKarmaLedger(user)
    });
  } catch (error) {
    console.error("Karma ledger error:", error);
    return res.status(500).json({ success: false, message: "Unable to load Karma ledger" });
  }
});
module.exports = router;