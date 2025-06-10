const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const {
	DynamoDBClient,
	BatchWriteItemCommand,
	ScanCommand,
	PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const app = express();

// Sử dụng cổng được Render gán hoặc mặc định là 5000 cho phát triển cục bộ
const port = process.env.PORT || 5000;

// Cấu hình AWS DynamoDB Client
const dynamoDBClient = new DynamoDBClient({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
});

// Cấu hình CORS để chấp nhận nhiều nguồn gốc
const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:5173",
	// "https://lorweb.vercel.app",
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
				callback(new Error("Không phải nguồn gốc được phép"));
			}
		},
	})
);
app.use(express.json());

// Xác định đường dẫn tuyệt đối đến chamPOC.json và commentUser.json
const filePath = path.join(__dirname, "chamPOC.json");
const commentFilePath = path.join(__dirname, "commentUser.json");

// Khai báo biến toàn cục
let championData = [];
let commentData = [];

// Hàm khởi tạo dữ liệu champion từ DynamoDB
const initializeData = async () => {
	try {
		// Thử lấy dữ liệu từ DynamoDB
		console.log("Đang lấy dữ liệu champion từ DynamoDB...");
		const params = { TableName: "champion" };
		const command = new ScanCommand(params);
		const response = await dynamoDBClient.send(command);

		if (response.Items && response.Items.length > 0) {
			championData = response.Items.map(item => ({
				name: item.name?.S || "",
				assets:
					item.assets?.L?.map(asset => ({
						gameAbsolutePath: asset.M?.gameAbsolutePath?.S || "",
						fullAbsolutePath: asset.M?.fullAbsolutePath?.S || "",
					})) || [],
				regions: item.regions?.SS || [],
				regionRefs: item.regionRefs?.SS || [],
				defaultPowers: item.defaultPowers?.L?.map(power => power.S || "") || [],
				defaultRelicsSet1:
					item.defaultRelicsSet1?.L?.map(relic => relic.S || "") || [],
				defaultRelicsSet2:
					item.defaultRelicsSet2?.L?.map(relic => relic.S || "") || [],
				defaultRelicsSet3:
					item.defaultRelicsSet3?.L?.map(relic => relic.S || "") || [],
				defaultRelicsSet4:
					item.defaultRelicsSet4?.L?.map(relic => relic.S || "") || [],
				defaultRelicsSet5:
					item.defaultRelicsSet5?.L?.map(relic => relic.S || "") || [],
				defaultRelicsSet6:
					item.defaultRelicsSet6?.L?.map(relic => relic.S || "") || [],
				defaultAdventurePower:
					item.defaultAdventurePower?.L?.map(power => power.S || "") || [],
				defaultItems: item.defaultItems?.L?.map(item => item.S || "") || [],
				note: item.note?.S || "",
				like:
					item.like?.L?.map(like => ({
						set1: parseInt(like.M?.set1?.N || "0"),
						set2: parseInt(like.M?.set2?.N || "0"),
						set3: parseInt(like.M?.set3?.N || "0"),
						set4: parseInt(like.M?.set4?.N || "0"),
						set5: parseInt(like.M?.set5?.N || "0"),
						set6: parseInt(like.M?.set6?.N || "0"),
					})) || [],
			}));
			console.log(`Đã lấy ${championData.length} champion từ DynamoDB`);

			// Lưu vào chamPOC.json để đồng bộ cục bộ
			await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
			console.log("Đã cập nhật chamPOC.json với dữ liệu từ DynamoDB");
		} else {
			console.log("Bảng champion trống, thử đọc từ chamPOC.json...");
			const fileExists = await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false);
			if (fileExists) {
				const data = await fs.readFile(filePath, "utf8");
				championData = JSON.parse(data);
				console.log(`Đã đọc ${championData.length} champion từ chamPOC.json`);
			} else {
				championData = [];
				await fs.writeFile(filePath, "[]");
				console.log("Đã tạo file chamPOC.json mới");
			}
		}
	} catch (error) {
		console.error("Lỗi khi lấy dữ liệu champion từ DynamoDB:", error.message);
		// Dự phòng: đọc từ chamPOC.json
		try {
			const fileExists = await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false);
			if (fileExists) {
				const data = await fs.readFile(filePath, "utf8");
				championData = JSON.parse(data);
				console.log(`Đã đọc ${championData.length} champion từ chamPOC.json`);
			} else {
				championData = [];
				await fs.writeFile(filePath, "[]");
				console.log("Đã tạo file chamPOC.json mới do lỗi DynamoDB");
			}
		} catch (fileError) {
			console.error("Lỗi khi đọc/tạo chamPOC.json:", fileError.message);
			championData = [];
		}
	}
};

// Hàm khởi tạo dữ liệu bình luận từ DynamoDB
const initializeCommentData = async () => {
	try {
		// Thử lấy dữ liệu từ DynamoDB
		console.log("Đang lấy dữ liệu bình luận từ DynamoDB...");
		const params = { TableName: "comments" };
		const command = new ScanCommand(params);
		const response = await dynamoDBClient.send(command);

		if (response.Items && response.Items.length > 0) {
			commentData = response.Items.map(item => ({
				commentId: item.commentId?.S || "",
				userName: item.userName?.S || "",
				comment: item.comment?.S || "",
				championName: item.championName?.S || "",
			}));
			console.log(`Đã lấy ${commentData.length} bình luận từ DynamoDB`);

			// Lưu vào commentUser.json để đồng bộ cục bộ
			await fs.writeFile(commentFilePath, JSON.stringify(commentData, null, 2));
			console.log("Đã cập nhật commentUser.json với dữ liệu từ DynamoDB");
		} else {
			console.log("Bảng comments trống, thử đọc từ commentUser.json...");
			const fileExists = await fs
				.access(commentFilePath)
				.then(() => true)
				.catch(() => false);
			if (fileExists) {
				const data = await fs.readFile(commentFilePath, "utf8");
				commentData = JSON.parse(data);
				console.log(
					`Đã đọc ${commentData.length} bình luận từ commentUser.json`
				);
			} else {
				commentData = [];
				await fs.writeFile(commentFilePath, "[]");
				console.log("Đã tạo file commentUser.json mới");
			}
		}
	} catch (error) {
		console.error("Lỗi khi lấy dữ liệu bình luận từ DynamoDB:", error.message);
		// Dự phòng: đọc từ commentUser.json
		try {
			const fileExists = await fs
				.access(commentFilePath)
				.then(() => true)
				.catch(() => false);
			if (fileExists) {
				const data = await fs.readFile(commentFilePath, "utf8");
				commentData = JSON.parse(data);
				console.log(
					`Đã đọc ${commentData.length} bình luận từ commentUser.json`
				);
			} else {
				commentData = [];
				await fs.writeFile(commentFilePath, "[]");
				console.log("Đã tạo file commentUser.json mới do lỗi DynamoDB");
			}
		} catch (fileError) {
			console.error("Lỗi khi đọc/tạo commentUser.json:", fileError.message);
			commentData = [];
		}
	}
};

// Thêm route mặc định
app.get("/", (req, res) => {
	res.json({
		message:
			"Chào mừng đến với Lorweb Backend API. Sử dụng các endpoint /api để lấy dữ liệu.",
	});
});

// API để lưu dữ liệu champion vào DynamoDB và chamPOC.json
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

	console.log("Received save-champion request:", { championName });

	// Xác thực đầu vào
	if (
		!championName ||
		typeof championName !== "string" ||
		championName.length > 50
	) {
		console.log("Invalid championName:", championName);
		return res.status(400).json({
			message: "Tên champion không hợp lệ. Phải là chuỗi không rỗng.",
		});
	}

	// Tìm champion trong dữ liệu cục bộ
	const championIndex = championData.findIndex(
		champ => champ.name === championName
	);
	if (championIndex === -1) {
		console.log("Champion not found:", championName);
		return res.status(404).json({ message: "Không tìm thấy champion để lưu." });
	}

	// Cập nhật dữ liệu cục bộ
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

	// Chuẩn bị dữ liệu cho DynamoDB
	const dynamoItem = {
		name: { S: championName },
		assets: {
			L: championData[championIndex].assets.map(asset => ({
				M: {
					gameAbsolutePath: { S: asset.gameAbsolutePath },
					fullAbsolutePath: { S: asset.fullAbsolutePath },
				},
			})),
		},
		regions: { SS: championData[championIndex].regions || [] },
		regionRefs: { SS: championData[championIndex].regionRefs || [] },
		defaultRelicsSet1: {
			L: defaultRelicsSet1
				? defaultRelicsSet1.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultRelicsSet2: {
			L: defaultRelicsSet2
				? defaultRelicsSet2.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultRelicsSet3: {
			L: defaultRelicsSet3
				? defaultRelicsSet3.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultRelicsSet4: {
			L: defaultRelicsSet4
				? defaultRelicsSet4.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultRelicsSet5: {
			L: defaultRelicsSet5
				? defaultRelicsSet5.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultRelicsSet6: {
			L: defaultRelicsSet6
				? defaultRelicsSet6.map(relic => ({ S: relic || "" }))
				: [],
		},
		defaultAdventurePower: {
			L: defaultAdventurePower
				? defaultAdventurePower.map(power => ({ S: power || "" }))
				: [],
		},
		defaultPowers: {
			L: defaultPowers ? defaultPowers.map(power => ({ S: power || "" })) : [],
		},
		defaultItems: {
			L: defaultItems ? defaultItems.map(item => ({ S: item || "" })) : [],
		},
		note: { S: note || "" },
		like: {
			L: championData[championIndex].like
				? championData[championIndex].like.map(like => ({
						M: {
							set1: { N: like.set1.toString() },
							set2: { N: like.set2.toString() },
							set3: { N: like.set3.toString() },
							set4: { N: like.set4.toString() },
							set5: { N: like.set5.toString() },
							set6: { N: like.set6.toString() },
						},
				  }))
				: [],
		},
	};

	try {
		// Lưu vào DynamoDB
		console.log("Saving to DynamoDB...");
		const putCommand = new PutItemCommand({
			TableName: "champion",
			Item: dynamoItem,
		});
		await dynamoDBClient.send(putCommand);
		console.log(`Đã lưu champion ${championName} vào DynamoDB`);

		// Lưu vào chamPOC.json để đồng bộ cục bộ
		await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
		console.log(`Đã lưu dữ liệu champion ${championName} vào chamPOC.json`);

		res.json({ message: "Dữ liệu đã được lưu thành công!" });
	} catch (error) {
		console.error("Lỗi khi lưu dữ liệu:", error.stack);
		res.status(500).json({ message: `Lỗi khi lưu dữ liệu: ${error.message}` });
	}
});

// API để cập nhật lượt thích của champion
app.post("/api/like-champion", async (req, res) => {
	const { championName, like } = req.body;

	if (
		!championName ||
		typeof championName !== "string" ||
		championName.length > 50
	) {
		return res.status(400).json({
			message: "Tên champion không hợp lệ. Phải là chuỗi không rỗng.",
		});
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
				"Dữ liệu lượt thích không hợp lệ. Phải là một đối tượng với các khóa từ set1 đến set6 và giá trị số không âm.",
		});
	}

	const championIndex = championData.findIndex(
		champ => champ.name === championName
	);
	if (championIndex === -1) {
		return res
			.status(404)
			.json({ message: "Không tìm thấy champion để cập nhật lượt thích." });
	}

	championData[championIndex].like = [like];

	// Chuẩn bị dữ liệu cho DynamoDB
	const dynamoItem = {
		name: { S: championName },
		assets: {
			L: championData[championIndex].assets.map(asset => ({
				M: {
					gameAbsolutePath: { S: asset.gameAbsolutePath },
					fullAbsolutePath: { S: asset.fullAbsolutePath },
				},
			})),
		},
		regions: { SS: championData[championIndex].regions || [] },
		regionRefs: { SS: championData[championIndex].regionRefs || [] },
		defaultRelicsSet1: {
			L: championData[championIndex].defaultRelicsSet1.map(relic => ({
				S: relic || "",
			})),
		},
		defaultRelicsSet2: {
			L: championData[championIndex].defaultRelicsSet2.map(relic => ({
				S: relic || "",
			})),
		},
		defaultRelicsSet3: {
			L: championData[championIndex].defaultRelicsSet3.map(relic => ({
				S: relic || "",
			})),
		},
		defaultRelicsSet4: {
			L: championData[championIndex].defaultRelicsSet4.map(relic => ({
				S: relic || "",
			})),
		},
		defaultRelicsSet5: {
			L: championData[championIndex].defaultRelicsSet5.map(relic => ({
				S: relic || "",
			})),
		},
		defaultRelicsSet6: {
			L: championData[championIndex].defaultRelicsSet6.map(relic => ({
				S: relic || "",
			})),
		},
		defaultAdventurePower: {
			L: championData[championIndex].defaultAdventurePower.map(power => ({
				S: power || "",
			})),
		},
		defaultPowers: {
			L: championData[championIndex].defaultPowers.map(power => ({
				S: power || "",
			})),
		},
		defaultItems: {
			L: championData[championIndex].defaultItems.map(item => ({
				S: item || "",
			})),
		},
		note: { S: championData[championIndex].note || "" },
		like: {
			L: [like].map(like => ({
				M: {
					set1: { N: like.set1.toString() },
					set2: { N: like.set2.toString() },
					set3: { N: like.set3.toString() },
					set4: { N: like.set4.toString() },
					set5: { N: like.set5.toString() },
					set6: { N: like.set6.toString() },
				},
			})),
		},
	};

	try {
		// Lưu vào DynamoDB
		const putCommand = new PutItemCommand({
			TableName: "champion",
			Item: dynamoItem,
		});
		await dynamoDBClient.send(putCommand);
		console.log(`Đã cập nhật lượt thích cho ${championName} trong DynamoDB`);

		// Lưu vào chamPOC.json
		await fs.writeFile(filePath, JSON.stringify(championData, null, 2));
		console.log(
			`Đã cập nhật lượt thích cho ${championName} trong chamPOC.json`
		);

		res.json({ message: "Lượt thích đã được cập nhật thành công!" });
	} catch (error) {
		console.error("Lỗi khi cập nhật lượt thích:", error.stack);
		res
			.status(500)
			.json({ message: `Lỗi khi cập nhật lượt thích: ${error.message}` });
	}
});

// Endpoint để tải file chamPOC.json
app.get("/download-data", (req, res) => {
	res.download(filePath, "chamPOC.json", err => {
		if (err) {
			res.status(500).send("Lỗi khi tải file: " + err.message);
		}
	});
});

// API để lấy dữ liệu tất cả champions
app.get("/api/champions", (req, res) => {
	console.log("Đã lấy tất cả champions từ nguồn gốc:", req.headers.origin);
	res.json(championData);
});

// API để lấy dữ liệu của một champion cụ thể
app.get("/api/get-champion/:name", (req, res) => {
	const championName = req.params.name;
	if (typeof championName !== "string" || championName.length > 50) {
		return res.status(400).json({
			message: "Tên champion không hợp lệ. Phải là chuỗi không rỗng.",
		});
	}

	const champion = championData.find(champ => champ.name === championName);

	if (champion) {
		console.log(`Đã lấy champion: ${championName}`);
		res.json(champion);
	} else {
		console.log(`Không tìm thấy champion: ${championName}`);
		res
			.status(404)
			.json({ message: `Không tìm thấy champion ${championName}` });
	}
});

// API để lấy tất cả bình luận
app.get("/api/comments", async (req, res) => {
	try {
		console.log("Đã lấy tất cả bình luận từ nguồn gốc:", req.headers.origin);
		res.json(commentData);
	} catch (error) {
		console.error("Lỗi khi lấy bình luận:", error.message);
		res.status(500).json({ message: "Lỗi khi tải bình luận" });
	}
});

// API để thêm bình luận mới
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
				"Dữ liệu bình luận không hợp lệ. userName, comment và championName phải là chuỗi không rỗng với độ dài hợp lý.",
		});
	}

	const newComment = {
		commentId: uuidv4(),
		userName,
		comment,
		championName,
	};

	// Cập nhật commentData
	commentData.push(newComment);

	// Chuẩn bị dữ liệu cho DynamoDB
	const dynamoItem = {
		commentId: { S: newComment.commentId },
		userName: { S: userName },
		comment: { S: comment },
		championName: { S: championName },
	};

	try {
		// Lưu vào DynamoDB
		const putCommand = new PutItemCommand({
			TableName: "comments",
			Item: dynamoItem,
		});
		await dynamoDBClient.send(putCommand);
		console.log(
			`Đã lưu bình luận cho ${championName} bởi ${userName} vào DynamoDB`
		);

		// Lưu vào commentUser.json
		await fs.writeFile(commentFilePath, JSON.stringify(commentData, null, 2));
		console.log(
			`Đã lưu bình luận cho ${championName} bởi ${userName} vào commentUser.json`
		);

		res.json({ message: "Bình luận đã được lưu thành công!" });
	} catch (error) {
		console.error("Lỗi khi lưu bình luận:", error.stack);
		res.status(500).json({ message: "Lỗi khi lưu bình luận" });
	}
});

// Route kiểm tra sức khỏe
app.get("/api/health", (req, res) => {
	console.log("Yêu cầu kiểm tra sức khỏe từ nguồn gốc:", req.headers.origin);
	res.json({
		status: "Server đang chạy",
		timestamp: new Date().toISOString(),
		port: port,
	});
});

// New endpoint to keep server awake
app.get("/api/ping", (req, res) => {
	res.send("Server is awake");
});

// Endpoint để đẩy dữ liệu từ chamPOC.json lên DynamoDB
app.post("/api/upload-to-dynamodb", async (req, res) => {
	try {
		const fileExists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);
		if (!fileExists) {
			return res
				.status(404)
				.json({ message: "Không tìm thấy file chamPOC.json" });
		}

		const data = await fs.readFile(filePath, "utf8");
		const champions = JSON.parse(data);

		const batchSize = 25;
		for (let i = 0; i < champions.length; i += batchSize) {
			const batch = champions.slice(i, i + batchSize);
			const putRequests = batch.map(champion => ({
				PutRequest: {
					Item: {
						name: { S: champion.name },
						assets: {
							L: champion.assets.map(asset => ({
								M: {
									gameAbsolutePath: { S: asset.gameAbsolutePath },
									fullAbsolutePath: { S: asset.fullAbsolutePath },
								},
							})),
						},
						regions: { SS: champion.regions },
						regionRefs: { SS: champion.regionRefs },
						defaultPowers: {
							L: champion.defaultPowers.map(power => ({ S: power || "" })),
						},
						defaultRelicsSet1: {
							L: champion.defaultRelicsSet1.map(relic => ({
								S: relic || "",
							})),
						},
						defaultRelicsSet2: {
							L: champion.defaultRelicsSet2.map(relic => ({
								S: relic || "",
							})),
						},
						defaultRelicsSet3: {
							L: champion.defaultRelicsSet3.map(relic => ({
								S: relic || "",
							})),
						},
						defaultRelicsSet4: {
							L: champion.defaultRelicsSet4.map(relic => ({
								S: relic || "",
							})),
						},
						defaultRelicsSet5: {
							L: champion.defaultRelicsSet5.map(relic => ({
								S: relic || "",
							})),
						},
						defaultRelicsSet6: {
							L: champion.defaultRelicsSet6.map(relic => ({
								S: relic || "",
							})),
						},
						defaultAdventurePower: {
							L: champion.defaultAdventurePower.map(power => ({
								S: power || "",
							})),
						},
						defaultItems: {
							L: champion.defaultItems.map(item => ({ S: item || "" })),
						},
						note: { S: champion.note || "" },
						like: {
							L: champion.like.map(like => ({
								M: {
									set1: { N: like.set1.toString() },
									set2: { N: like.set2.toString() },
									set3: { N: like.set3.toString() },
									set4: { N: like.set4.toString() },
									set5: { N: like.set5.toString() },
									set6: { N: like.set6.toString() },
								},
							})),
						},
					},
				},
			}));

			const params = {
				RequestItems: {
					champion: putRequests,
				},
			};

			const command = new BatchWriteItemCommand(params);
			await dynamoDBClient.send(command);
			console.log(
				`Đã đẩy lô ${i / batchSize + 1} trong ${Math.ceil(
					champions.length / batchSize
				)}`
			);
		}

		res.json({ message: "Dữ liệu đã được đẩy lên DynamoDB thành công" });
	} catch (error) {
		console.error("Lỗi khi đẩy lên DynamoDB:", error.stack);
		res.status(500).json({ message: `Lỗi khi đẩy dữ liệu: ${error.message}` });
	}
});

// Endpoint để kiểm tra dữ liệu trong bảng DynamoDB
app.get("/api/check-dynamodb", async (req, res) => {
	try {
		const params = {
			TableName: "champion",
		};

		const command = new ScanCommand(params);
		const response = await dynamoDBClient.send(command);

		const items = response.Items.map(item => ({
			name: item.name?.S || "",
			assets:
				item.assets?.L?.map(asset => ({
					gameAbsolutePath: asset.M?.gameAbsolutePath?.S || "",
					fullAbsolutePath: asset.M?.fullAbsolutePath?.S || "",
				})) || [],
			regions: item.regions?.SS || [],
			regionRefs: item.regionRefs?.SS || [],
			defaultPowers: item.defaultPowers?.L?.map(power => power.S || "") || [],
			defaultRelicsSet1:
				item.defaultRelicsSet1?.L?.map(relic => relic.S || "") || [],
			defaultRelicsSet2:
				item.defaultRelicsSet2?.L?.map(relic => relic.S || "") || [],
			defaultRelicsSet3:
				item.defaultRelicsSet3?.L?.map(relic => relic.S || "") || [],
			defaultRelicsSet4:
				item.defaultRelicsSet4?.L?.map(relic => relic.S || "") || [],
			defaultRelicsSet5:
				item.defaultRelicsSet5?.L?.map(relic => relic.S || "") || [],
			defaultRelicsSet6:
				item.defaultRelicsSet6?.L?.map(relic => relic.S || "") || [],
			defaultAdventurePower:
				item.defaultAdventurePower?.L?.map(power => power.S || "") || [],
			defaultItems: item.defaultItems?.L?.map(item => item.S || "") || [],
			note: item.note?.S || "",
			like:
				item.like?.L?.map(like => ({
					set1: parseInt(like.M?.set1?.N || "0"),
					set2: parseInt(like.M?.set2?.N || "0"),
					set3: parseInt(like.M?.set3?.N || "0"),
					set4: parseInt(like.M?.set4?.N || "0"),
					set5: parseInt(like.M?.set5?.N || "0"),
					set6: parseInt(like.M?.set6?.N || "0"),
				})) || [],
		}));

		console.log(`Đã lấy ${items.length} mục từ bảng champion`);
		res.json({
			message: "Dữ liệu từ bảng champion",
			itemCount: items.length,
			items: items,
		});
	} catch (error) {
		console.error("Lỗi khi kiểm tra bảng DynamoDB:", error.stack);
		res
			.status(500)
			.json({ message: `Lỗi khi kiểm tra dữ liệu: ${error.message}` });
	}
});

// Endpoint để đẩy dữ liệu từ commentUser.json lên DynamoDB
app.post("/api/upload-comments-to-dynamodb", async (req, res) => {
	try {
		const fileExists = await fs
			.access(commentFilePath)
			.then(() => true)
			.catch(() => false);
		if (!fileExists) {
			return res
				.status(404)
				.json({ message: "Không tìm thấy file commentUser.json" });
		}

		const data = await fs.readFile(commentFilePath, "utf8");
		const comments = JSON.parse(data);
		console.log("Số lượng bình luận trong file:", comments.length);

		const batchSize = 25;
		for (let i = 0; i < comments.length; i += batchSize) {
			const batch = comments.slice(i, i + batchSize);
			const putRequests = batch.map(comment => ({
				PutRequest: {
					Item: {
						commentId: { S: comment.commentId || uuidv4() },
						userName: { S: comment.userName || "" },
						comment: { S: comment.comment || "" },
						championName: { S: comment.championName || "" },
					},
				},
			}));

			const params = {
				RequestItems: {
					comments: putRequests,
				},
			};

			console.log(
				"Gửi lô bình luận:",
				i / batchSize + 1,
				"với số lượng mục:",
				putRequests.length
			);
			const command = new BatchWriteItemCommand(params);
			const response = await dynamoDBClient.send(command);
			console.log("Phản hồi từ DynamoDB:", response);
			if (
				response.UnprocessedItems &&
				Object.keys(response.UnprocessedItems).length > 0
			) {
				console.error(
					"Có bình luận chưa được xử lý:",
					response.UnprocessedItems
				);
			}
			console.log(
				`Đã đẩy lô bình luận ${i / batchSize + 1} trong ${Math.ceil(
					comments.length / batchSize
				)}`
			);
		}

		res.json({ message: "Bình luận đã được đẩy lên DynamoDB thành công" });
	} catch (error) {
		console.error("Lỗi chi tiết khi đẩy bình luận lên DynamoDB:", error.stack);
		res
			.status(500)
			.json({ message: `Lỗi khi đẩy bình luận: ${error.message}` });
	}
});

// Khởi động server sau khi khởi tạo dữ liệu
const startServer = async () => {
	await initializeData();
	await initializeCommentData();

	app.listen(port, () => {
		console.log(`Backend đang chạy tại cổng ${port}`);
	});
};

// Khởi động server
startServer().catch(error => {
	console.error("Không thể khởi động server:", error.stack);
	process.exit(1);
});
