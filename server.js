const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const port = 5000;

// Cấu hình CORS để chấp nhận nhiều nguồn gốc
const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error("Không phải nguồn gốc được phép"));
			}
		},
	})
);
app.use(express.json());

// Định nghĩa đường dẫn tuyệt đối tới file chamPOC.json và commentUser.json
const filePath = path.resolve(__dirname, "../src/chamPOC.json");
const commentFilePath = path.resolve(__dirname, "../src/commentUser.json");

// Đọc dữ liệu hiện tại từ chamPOC.json
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
			console.log("Tạo file chamPOC.json mới tại:", filePath);
		}
	} catch (error) {
		console.error("Lỗi khởi tạo dữ liệu:", error.message);
		championData = [];
		try {
			await fs.writeFile(filePath, "[]");
			console.log("Tạo file chamPOC.json mới do lỗi đọc:", error.message);
		} catch (writeError) {
			console.error("Lỗi tạo file chamPOC.json:", writeError.message);
			console.warn("Tiếp tục khởi động server với dữ liệu rỗng.");
		}
	}
};

// Khởi tạo commentUser.json nếu chưa tồn tại
const initializeCommentData = async () => {
	try {
		const fileExists = await fs
			.access(commentFilePath)
			.then(() => true)
			.catch(() => false);
		if (!fileExists) {
			await fs.writeFile(commentFilePath, "[]");
			console.log("Tạo file commentUser.json mới tại:", commentFilePath);
		}
	} catch (error) {
		console.error("Lỗi khởi tạo commentUser.json:", error.message);
	}
};

// Khởi động server sau khi đọc dữ liệu
const startServer = async () => {
	await initializeData();
	await initializeCommentData();

	// API để lưu dữ liệu của tướng
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
			return res.status(404).json({ message: "Không tìm thấy tướng để lưu." });
		}

		try {
			await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
			res.json({ message: "Dữ liệu đã được lưu thành công!" });
		} catch (error) {
			console.error("Lỗi ghi file:", error.message);
			res
				.status(500)
				.json({ message: `Lỗi khi lưu dữ liệu: ${error.message}` });
		}
	});

	// API để cập nhật lượt thích của tướng
	app.post("/api/like-champion", async (req, res) => {
		const { championName, like } = req.body;

		// Kiểm tra dữ liệu đầu vào
		if (!championName || !like) {
			return res
				.status(400)
				.json({ message: "Thiếu championName hoặc like trong request body." });
		}

		// Kiểm tra định dạng của like
		if (
			typeof like !== "object" ||
			!like ||
			!["set1", "set2", "set3", "set4", "set5", "set6"].every(
				key => typeof like[key] === "number"
			)
		) {
			return res.status(400).json({
				message:
					"Dữ liệu like không hợp lệ. Phải là một object với các key set1 đến set6 và giá trị là số.",
			});
		}

		const championIndex = championData.findIndex(
			champ => champ.name === championName
		);
		if (championIndex === -1) {
			return res
				.status(404)
				.json({ message: "Không tìm thấy tướng để cập nhật lượt thích." });
		}

		// Khởi tạo trường like nếu chưa tồn tại
		if (!championData[championIndex].like) {
			championData[championIndex].like = [];
		}

		// Cập nhật trường like
		championData[championIndex].like = [like];

		try {
			await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
			res.json({ message: "Lượt thích đã được cập nhật thành công!" });
		} catch (error) {
			console.error("Lỗi ghi file:", error.message);
			res
				.status(500)
				.json({ message: `Lỗi khi cập nhật lượt thích: ${error.message}` });
		}
	});

	// API để lấy dữ liệu của tất cả tướng
	app.get("/api/champions", (req, res) => {
		res.json(championData);
	});

	// API để lấy dữ liệu của một tướng cụ thể
	app.get("/api/get-champion/:name", (req, res) => {
		const championName = req.params.name;
		const champion = championData.find(champ => champ.name === championName);

		if (champion) {
			res.json(champion);
		} else {
			res.status(404).json({ message: `Không tìm thấy tướng ${championName}` });
		}
	});

	// API để lấy tất cả bình luận
	app.get("/api/comments", async (req, res) => {
		try {
			const commentData = await fs.readFile(commentFilePath, "utf8");
			res.json(JSON.parse(commentData));
		} catch (error) {
			console.error("Lỗi đọc commentUser.json:", error.message);
			res.status(500).json({ message: "Lỗi khi tải bình luận" });
		}
	});

	// API để thêm bình luận mới
	app.post("/api/comments", async (req, res) => {
		const { userName, comment, championName } = req.body;
		if (!userName || !comment || !championName) {
			return res.status(400).json({ message: "Thiếu thông tin bình luận" });
		}

		try {
			const commentData = await fs.readFile(commentFilePath, "utf8");
			const comments = JSON.parse(commentData);
			comments.push({ userName, comment, championName });
			await fs.writeFile(commentFilePath, JSON.stringify(comments, null, 2));
			res.json({ message: "Bình luận đã được lưu!" });
		} catch (error) {
			console.error("Lỗi lưu bình luận:", error.message);
			res.status(500).json({ message: "Lỗi khi lưu bình luận" });
		}
	});

	// Thêm route kiểm tra server
	app.get("/api/health", (req, res) => {
		res.json({
			status: "Server is running",
			timestamp: new Date().toISOString(),
		});
	});

	app.listen(port, () => {
		console.log(`Backend đang chạy tại http://localhost:${port}`);
	});
};

// Khởi động server
startServer().catch(error => {
	console.error("Không thể khởi động server:", error.message);
	process.exit(1);
});
