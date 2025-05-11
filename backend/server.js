const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const app = express();

// Use Render's assigned port or default to 5000 for local development
const port = process.env.PORT || 5000;

// Configure CORS to accept multiple origins
const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:5173",
	"https://lorweb.vercel.app",
	process.env.FRONTEND_URL || "*",
];
app.use(
	cors({
		origin: (origin, callback) => {
			if (
				!origin ||
				allowedOrigins.includes(origin) ||
				allowedOrigins.includes("*")
			) {
				callback(null, true);
			} else {
				callback(new Error("Not an allowed origin"));
			}
		},
	})
);
app.use(express.json());

// Define absolute paths to chamPOC.json and commentUser.json
const filePath = path.join(__dirname, "chamPOC.json");
const commentFilePath = path.join(__dirname, "commentUser.json");

// Read current data from chamPOC.json
let championData;
const initializeData = async () => {
	try {
		const fileExists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);
		if (fileExists) {
			const data = await fs.readFile(filePath, "utf8");
			championData = JSON.parse(data);
		} else {
			championData = [];
			await fs.writeFile(filePath, "[]");
			console.log("Created new chamPOC.json at:", filePath);
		}
	} catch (error) {
		console.error("Error initializing data:", error.message);
		championData = [];
		try {
			await fs.writeFile(filePath, "[]");
			console.log("Created new chamPOC.json due to read error:", error.message);
		} catch (writeError) {
			console.error("Error creating chamPOC.json:", writeError.message);
			console.warn("Continuing server startup with empty data.");
		}
	}
};

// Initialize commentUser.json if it doesn't exist
const initializeCommentData = async () => {
	try {
		const fileExists = await fs
			.access(commentFilePath)
			.then(() => true)
			.catch(() => false);
		if (!fileExists) {
			await fs.writeFile(commentFilePath, "[]");
			console.log("Created new commentUser.json at:", commentFilePath);
		}
	} catch (error) {
		console.error("Error initializing commentUser.json:", error.message);
	}
};

// Add default route
app.get("/", (req, res) => {
	res.json({
		message: "Welcome to Lorweb Backend API. Use /api endpoints for data.",
	});
});

// API to save champion data
app.post("/api/save-champion", async (req, res) => {
	const {
		championName,
		defaultRelicsSet1,
		defaultRelicsSet2,
		defaultRelicsSet3,
		defaultRelicsSet4,
		defaultRelicsSet5,
		defaultRelicsSet6,
		defaultAdventurePower,
		defaultPowers,
		defaultItems,
		note,
	} = req.body;

	if (
		!championName ||
		typeof championName !== "string" ||
		championName.length > 50
	) {
		return res
			.status(400)
			.json({ message: "Invalid championName. Must be a non-empty string." });
	}

	const championIndex = championData.findIndex(
		champ => champ.name === championName
	);
	if (championIndex !== -1) {
		championData[championIndex] = {
			...championData[championIndex],
			defaultRelicsSet1: Array.isArray(defaultRelicsSet1)
				? defaultRelicsSet1.slice(0, 3)
				: [],
			defaultRelicsSet2: Array.isArray(defaultRelicsSet2)
				? defaultRelicsSet2.slice(0, 3)
				: [],
			defaultRelicsSet3: Array.isArray(defaultRelicsSet3)
				? defaultRelicsSet3.slice(0, 3)
				: [],
			defaultRelicsSet4: Array.isArray(defaultRelicsSet4)
				? defaultRelicsSet4.slice(0, 3)
				: [],
			defaultRelicsSet5: Array.isArray(defaultRelicsSet5)
				? defaultRelicsSet5.slice(0, 3)
				: [],
			defaultRelicsSet6: Array.isArray(defaultRelicsSet6)
				? defaultRelicsSet6.slice(0, 3)
				: [],
			defaultAdventurePower: Array.isArray(defaultAdventurePower)
				? defaultAdventurePower.slice(0, 9)
				: [],
			defaultPowers: Array.isArray(defaultPowers)
				? defaultPowers.slice(0, 6)
				: [],
			defaultItems: Array.isArray(defaultItems) ? defaultItems.slice(0, 9) : [],
			note: typeof note === "string" ? note.slice(0, 1000) : "",
		};
	} else {
		return res.status(404).json({ message: "Champion not found to save." });
	}

	try {
		await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
		console.log(`Saved champion data for ${championName}`);
		res.json({ message: "Data saved successfully!" });
	} catch (error) {
		console.error("Error writing file:", error.message);
		res.status(500).json({ message: `Error saving data: ${error.message}` });
	}
});

// API to update champion likes
app.post("/api/like-champion", async (req, res) => {
	const { championName, like } = req.body;

	if (
		!championName ||
		typeof championName !== "string" ||
		championName.length > 50
	) {
		return res
			.status(400)
			.json({ message: "Invalid championName. Must be a non-empty string." });
	}

	if (
		typeof like !== "object" ||
		!like ||
		!["set1", "set2", "set3", "set4", "set5", "set6"].every(
			key => typeof like[key] === "number" && like[key] >= 0
		)
	) {
		return res.status(400).json({
			message:
				"Invalid like data. Must be an object with keys set1 to set6 and non-negative numeric values.",
		});
	}

	const championIndex = championData.findIndex(
		champ => champ.name === championName
	);
	if (championIndex === -1) {
		return res
			.status(404)
			.json({ message: "Champion not found to update likes." });
	}

	if (!championData[championIndex].like) {
		championData[championIndex].like = [];
	}

	championData[championIndex].like = [like];

	try {
		await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
		console.log(`Updated likes for ${championName}`);
		res.json({ message: "Likes updated successfully!" });
	} catch (error) {
		console.error("Error writing file:", error.message);
		res.status(500).json({ message: `Error updating likes: ${error.message}` });
	}
});
// Endpoint để tải file data.json
app.get("/download-data", (req, res) => {
	res.download(dataFilePath, "chamPOC.json", err => {
		if (err) {
			res.status(500).send("Lỗi khi tải file: " + err.message);
		}
	});
});

// API to get all champions data
app.get("/api/champions", (req, res) => {
	console.log("Fetched all champions from origin:", req.headers.origin);
	res.json(championData);
});

// API to get a specific champion's data
app.get("/api/get-champion/:name", (req, res) => {
	const championName = req.params.name;
	if (typeof championName !== "string" || championName.length > 50) {
		return res
			.status(400)
			.json({ message: "Invalid championName. Must be a non-empty string." });
	}

	const champion = championData.find(champ => champ.name === championName);

	if (champion) {
		console.log(`Fetched champion: ${championName}`);
		res.json(champion);
	} else {
		console.log(`Champion not found: ${championName}`);
		res.status(404).json({ message: `Champion ${championName} not found` });
	}
});

// API to get all comments
app.get("/api/comments", async (req, res) => {
	try {
		const commentData = await fs.readFile(commentFilePath, "utf8");
		console.log("Fetched all comments from origin:", req.headers.origin);
		res.json(JSON.parse(commentData));
	} catch (error) {
		console.error("Error reading commentUser.json:", error.message);
		res.status(500).json({ message: "Error loading comments" });
	}
});

// API to add a new comment
app.post("/api/comments", async (req, res) => {
	const { userName, comment, championName } = req.body;

	if (
		!userName ||
		typeof userName !== "string" ||
		userName.length > 50 ||
		!comment ||
		typeof comment !== "string" ||
		comment.length > 500 ||
		!championName ||
		typeof championName !== "string" ||
		championName.length > 50
	) {
		return res.status(400).json({
			message:
				"Invalid comment data. userName, comment, and championName must be non-empty strings with reasonable length.",
		});
	}

	try {
		const commentData = await fs.readFile(commentFilePath, "utf8");
		const comments = JSON.parse(commentData);
		comments.push({ userName, comment, championName });
		await fs.writeFile(commentFilePath, JSON.stringify(comments, null, 2));
		console.log(`Added comment for ${championName} by ${userName}`);
		res.json({ message: "Comment saved successfully!" });
	} catch (error) {
		console.error("Error saving comment:", error.message);
		res.status(500).json({ message: "Error saving comment" });
	}
});

// Health check route
app.get("/api/health", (req, res) => {
	console.log("Health check requested from origin:", req.headers.origin);
	res.json({
		status: "Server is running",
		timestamp: new Date().toISOString(),
		port: port,
	});
});

// Start server after initializing data
const startServer = async () => {
	await initializeData();
	await initializeCommentData();

	app.listen(port, () => {
		console.log(`Backend running at port ${port}`);
	});
};

// Start server
startServer().catch(error => {
	console.error("Failed to start server:", error.message);
	process.exit(1);
});
