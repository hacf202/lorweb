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
	// Add your Render frontend URL here, e.g., "https://your-frontend.onrender.com"
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
const dataDir = path.resolve(__dirname, "data");
const filePath = path.join(dataDir, "chamPOC.json");
const commentFilePath = path.join(dataDir, "commentUser.json");

// Ensure data directory exists
const ensureDataDirectory = async () => {
	try {
		await fs.mkdir(dataDir, { recursive: true });
	} catch (error) {
		console.error("Error creating data directory:", error.message);
	}
};

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

// Start server after initializing data
const startServer = async () => {
	await ensureDataDirectory();
	await initializeData();
	await initializeCommentData();

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

		const championIndex = championData.findIndex(
			champ => champ.name === championName
		);
		if (championIndex !== -1) {
			championData[championIndex] = {
				...championData[championIndex],
				defaultRelicsSet1: defaultRelicsSet1 || [],
				defaultRelicsSet2: defaultRelicsSet2 || [],
				defaultRelicsSet3: defaultRelicsSet3 || [],
				defaultRelicsSet4: defaultRelicsSet4 || [],
				defaultRelicsSet5: defaultRelicsSet5 || [],
				defaultRelicsSet6: defaultRelicsSet6 || [],
				defaultAdventurePower: defaultAdventurePower || [],
				defaultPowers: defaultPowers || [],
				defaultItems: defaultItems || [],
				note: note || "",
			};
		} else {
			return res.status(404).json({ message: "Champion not found to save." });
		}

		try {
			await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
			res.json({ message: "Data saved successfully!" });
		} catch (error) {
			console.error("Error writing file:", error.message);
			res.status(500).json({ message: `Error saving data: ${error.message}` });
		}
	});

	// API to update champion likes
	app.post("/api/like-champion", async (req, res) => {
		const { championName, like } = req.body;

		// Validate input data
		if (!championName || !like) {
			return res
				.status(400)
				.json({ message: "Missing championName or like in request body." });
		}

		// Validate like format
		if (
			typeof like !== "object" ||
			!like ||
			!["set1", "set2", "set3", "set4", "set5", "set6"].every(
				key => typeof like[key] === "number"
			)
		) {
			return res.status(400).json({
				message:
					"Invalid like data. Must be an object with keys set1 to set6 and numeric values.",
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

		// Initialize like field if it doesn't exist
		if (!championData[championIndex].like) {
			championData[championIndex].like = [];
		}

		// Update like field
		championData[championIndex].like = [like];

		try {
			await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
			res.json({ message: "Likes updated successfully!" });
		} catch (error) {
			console.error("Error writing file:", error.message);
			res
				.status(500)
				.json({ message: `Error updating likes: ${error.message}` });
		}
	});

	// API to get all champions data
	app.get("/api/champions", (req, res) => {
		res.json(championData);
	});

	// API to get a specific champion's data
	app.get("/api/get-champion/:name", (req, res) => {
		const championName = req.params.name;
		const champion = championData.find(champ => champ.name === championName);

		if (champion) {
			res.json(champion);
		} else {
			res.status(404).json({ message: `Champion ${championName} not found` });
		}
	});

	// API to get all comments
	app.get("/api/comments", async (req, res) => {
		try {
			const commentData = await fs.readFile(commentFilePath, "utf8");
			res.json(JSON.parse(commentData));
		} catch (error) {
			console.error("Error reading commentUser.json:", error.message);
			res.status(500).json({ message: "Error loading comments" });
		}
	});

	// API to add a new comment
	app.post("/api/comments", async (req, res) => {
		const { userName, comment, championName } = req.body;
		if (!userName || !comment || !championName) {
			return res.status(400).json({ message: "Missing comment information" });
		}

		try {
			const commentData = await fs.readFile(commentFilePath, "utf8");
			const comments = JSON.parse(commentData);
			comments.push({ userName, comment, championName });
			await fs.writeFile(commentFilePath, JSON.stringify(comments, null, 2));
			res.json({ message: "Comment saved successfully!" });
		} catch (error) {
			console.error("Error saving comment:", error.message);
			res.status(500).json({ message: "Error saving comment" });
		}
	});

	// Health check route
	app.get("/api/health", (req, res) => {
		res.json({
			status: "Server is running",
			timestamp: new Date().toISOString(),
			port: port,
		});
	});

	app.listen(port, () => {
		console.log(`Backend running at port ${port}`);
	});
};

// Start server
startServer().catch(error => {
	console.error("Failed to start server:", error.message);
	process.exit(1);
});
