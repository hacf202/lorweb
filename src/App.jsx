import "./cssReset.css";
import "./App.css";
import iconRegionList from "./iconRegions";
import relicList from "./relics-vi_vn.json";
import powerList from "./powers-vi_vn.json";
import itemList from "./items-vi_vn.json";
import { useState, useMemo, useCallback, useEffect } from "react";
import { memo } from "react";
import axios from "axios";

const SLOT_SIZES = {
	relic: 3,
	power: 9,
	item: 9,
	defaultPower: 6,
};

const ITEM_TYPES = {
	RELIC: "relic",
	POWER: "power",
	ITEM: "item",
};

const rarityOrder = { Legendary: 1, Epic: 2, Rare: 3, Common: 4, Special: 5 };

// Component for individual champion card
const ChampionCard = memo(({ champion, onSelectChampion }) => {
	const handleClick = () => onSelectChampion(champion);

	return (
		<div id='container' onClick={handleClick}>
			<h2 id='title'>{champion.name}</h2>
			<div id='region'>
				{champion.regions && Array.isArray(champion.regions) ? (
					champion.regions.map((iconRegion, index) => (
						<img
							loading='lazy'
							key={index}
							className='icon'
							src={findRegionIconLink(iconRegion)}
							alt={champion.regions[index]}
						/>
					))
				) : (
					<p>Không có khu vực</p>
				)}
			</div>
			<img
				id='picChampions'
				src={champion.assets[0].fullAbsolutePath}
				alt={champion.name}
			/>
		</div>
	);
});

// Component for individual slot (relic, power, item)
const ItemSlot = memo(
	({
		slot,
		slotIndex,
		setNumber,
		type,
		handleDrop,
		handleDragStart,
		handleRemoveItem,
		getItemImage,
	}) => (
		<div
			className={`${type}-slot ${slot ? "filled" : ""}`}
			onDrop={e => handleDrop(e, slotIndex, setNumber)}
			onDragOver={e => e.preventDefault()}
		>
			{slot ? (
				<div className={`${type}-slot-content`}>
					<img
						loading='lazy'
						className={`icon${type.charAt(0).toUpperCase() + type.slice(1)}`}
						src={getItemImage(slot).assetAbsolutePath}
						alt={slot.name}
						draggable
						onDragStart={e =>
							handleDragStart(e, slot.name, type, setNumber, slotIndex)
						}
					/>
					<div className='tooltip'>
						<img
							loading='lazy'
							src={getItemImage(slot).assetFullAbsolutePath}
							alt={slot.name}
						/>
					</div>
					<button
						className={`delete-${type}-btn`}
						onClick={() => handleRemoveItem(slotIndex, setNumber)}
					>
						✖
					</button>
				</div>
			) : (
				<p>+</p>
			)}
		</div>
	)
);

// Component for relic set
const RelicSet = ({
	setNumber,
	relicSets,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
	handleLike,
	hasLiked,
	likes,
}) => (
	<div className='relic-set'>
		<h2>
			Bộ {setNumber} <span>(Lượt thích: {likes[`set${setNumber}`] || 0})</span>
		</h2>
		<div className='relic-slots'>
			{relicSets[setNumber]?.map((slot, slotIndex) => (
				<ItemSlot
					key={slotIndex}
					slot={slot}
					slotIndex={slotIndex}
					setNumber={setNumber}
					type={ITEM_TYPES.RELIC}
					handleDrop={handleDrop}
					handleDragStart={handleDragStart}
					handleRemoveItem={handleRemoveItem}
					getItemImage={getItemImage}
				/>
			)) || null}
		</div>
		<button
			className='like-relic-btn'
			onClick={() => handleLike(setNumber)}
			disabled={hasLiked}
		>
			Thích
		</button>
	</div>
);

// Component for power set
const PowerSet = ({
	powerSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
}) => (
	<div className='power-set'>
		<h2>Sức Mạnh Phiêu Lưu</h2>
		<div className='power-slots'>
			{powerSlots.map((slot, slotIndex) => (
				<ItemSlot
					key={slotIndex}
					slot={slot}
					slotIndex={slotIndex}
					setNumber={7}
					type={ITEM_TYPES.POWER}
					handleDrop={handleDrop}
					handleDragStart={handleDragStart}
					handleRemoveItem={handleRemoveItem}
					getItemImage={getItemImage}
				/>
			))}
		</div>
	</div>
);

// Component for item set
const ItemSet = ({
	itemSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
}) => (
	<div className='item-set'>
		<h2>Vật Phẩm</h2>
		<div className='item-slots'>
			{itemSlots.map((slot, slotIndex) => (
				<ItemSlot
					key={slotIndex}
					slot={slot}
					slotIndex={slotIndex}
					setNumber={8}
					type={ITEM_TYPES.ITEM}
					handleDrop={handleDrop}
					handleDragStart={handleDragStart}
					handleRemoveItem={handleRemoveItem}
					getItemImage={getItemImage}
				/>
			))}
		</div>
	</div>
);

// Component for default powers
const DefaultPowerSet = ({
	defaultPowerSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
}) => (
	<div className='default-power-set'>
		<h2>Chòm Sao</h2>
		<div className='default-power-slots'>
			{defaultPowerSlots.map((slot, slotIndex) => (
				<ItemSlot
					key={slotIndex}
					slot={slot}
					slotIndex={slotIndex}
					setNumber={9}
					type={ITEM_TYPES.POWER}
					handleDrop={handleDrop}
					handleDragStart={handleDragStart}
					handleRemoveItem={handleRemoveItem}
					getItemImage={getItemImage}
				/>
			))}
		</div>
	</div>
);

// Component for notes
const NoteSet = ({ notes, selectedChampion, handleNoteChange }) => (
	<div className='note-set'>
		<h2>Ghi Chú</h2>
		<div className='note-content'>
			<textarea
				className='note-textarea'
				value={notes[selectedChampion.name] || ""}
				onChange={e => handleNoteChange(e, selectedChampion.name)}
				placeholder='Nhập ghi chú cho tướng...'
			/>
		</div>
	</div>
);

// Component for comments
const CommentSet = ({
	comments,
	championName,
	userName,
	setUserName,
	newComment,
	setNewComment,
	handleAddComment,
}) => (
	<div className='comment-set'>
		<h2>Bình Luận</h2>
		<div className='comment-content'>
			{comments
				.filter(comment => comment.championName === championName)
				.map((comment, index) => (
					<div key={index} className='comment-item'>
						<strong>{comment.userName}: </strong>
						<span>{comment.comment}</span>
					</div>
				))}
		</div>
		<div className='comment-form'>
			<input
				type='text'
				className='comment-input'
				placeholder='Tên của bạn...'
				value={userName}
				onChange={e => setUserName(e.target.value)}
			/>
			<textarea
				className='comment-textarea'
				placeholder='Nhập bình luận của bạn...'
				value={newComment}
				onChange={e => setNewComment(e.target.value)}
			/>
			<button className='comment-submit-btn' onClick={handleAddComment}>
				Xác nhận
			</button>
		</div>
	</div>
);

function findRegionIconLink(regionIcon) {
	const item = iconRegionList.find(item => item.name === regionIcon);
	return item?.iconAbsolutePath || "default-icon.png";
}

// Utility function (moved up to avoid ReferenceError)
const initializeChampionState = champion => {
	const initializeSlots = (items, type, maxSlots) =>
		Array(maxSlots)
			.fill(null)
			.map((_, index) => (items[index] ? { name: items[index], type } : null));

	return {
		relicSets: {
			1: initializeSlots(
				champion.defaultRelicsSet1 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
			2: initializeSlots(
				champion.defaultRelicsSet2 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
			3: initializeSlots(
				champion.defaultRelicsSet3 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
			4: initializeSlots(
				champion.defaultRelicsSet4 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
			5: initializeSlots(
				champion.defaultRelicsSet5 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
			6: initializeSlots(
				champion.defaultRelicsSet6 || [],
				ITEM_TYPES.RELIC,
				SLOT_SIZES.relic
			),
		},
		powerSlots: initializeSlots(
			champion.defaultAdventurePower || [],
			ITEM_TYPES.POWER,
			SLOT_SIZES.power
		),
		defaultPowerSlots: initializeSlots(
			champion.defaultPowers || [],
			ITEM_TYPES.POWER,
			SLOT_SIZES.defaultPower
		),
		itemSlots: initializeSlots(
			getValidDefaultItems(champion),
			ITEM_TYPES.ITEM,
			SLOT_SIZES.item
		),
	};
};

const getValidDefaultItems = champion => {
	const defaultItems = Array.isArray(champion.defaultItems)
		? champion.defaultItems
		: [];
	return defaultItems
		.filter(name => itemList.some(item => item.name === name))
		.slice(0, SLOT_SIZES.item);
};

// Default likes để đảm bảo luôn có giá trị hợp lệ
const defaultLikes = { set1: 0, set2: 0, set3: 0, set4: 0, set5: 0, set6: 0 };

function App() {
	// Memoized sorted lists
	const sortedRelicList = useMemo(
		() =>
			[...relicList].sort((a, b) => {
				const rarityComparison =
					rarityOrder[a.rarityRef] - rarityOrder[b.rarityRef];
				return rarityComparison || a.name.localeCompare(b.name, "vi");
			}),
		[]
	);

	const sortedPowerList = useMemo(
		() =>
			[...powerList].sort((a, b) => {
				const rarityComparison =
					rarityOrder[a.rarityRef] - rarityOrder[b.rarityRef];
				return rarityComparison || a.name.localeCompare(b.name, "vi");
			}),
		[]
	);

	const sortedItemList = useMemo(
		() =>
			[...itemList].sort((a, b) => {
				const rarityComparison =
					rarityOrder[a.rarityRef] - rarityOrder[b.rarityRef];
				return rarityComparison || a.name.localeCompare(b.name, "vi");
			}),
		[]
	);

	// Initialize state with fallback from localStorage
	const savedState = localStorage.getItem("championConfig");
	const initialState = savedState ? JSON.parse(savedState) : null;

	const [championData, setChampionData] = useState([]);
	const [selectedChampion, setSelectedChampion] = useState(
		initialState?.selectedChampion || { name: "" }
	);
	const [relicSets, setRelicSets] = useState(
		initialState?.relicSets || {
			1: Array(SLOT_SIZES.relic).fill(null),
			2: Array(SLOT_SIZES.relic).fill(null),
			3: Array(SLOT_SIZES.relic).fill(null),
			4: Array(SLOT_SIZES.relic).fill(null),
			5: Array(SLOT_SIZES.relic).fill(null),
			6: Array(SLOT_SIZES.relic).fill(null),
		}
	);
	const [powerSlots, setPowerSlots] = useState(
		initialState?.powerSlots || Array(SLOT_SIZES.power).fill(null)
	);
	const [defaultPowerSlots, setDefaultPowerSlots] = useState(
		initialState?.defaultPowerSlots || Array(SLOT_SIZES.defaultPower).fill(null)
	);
	const [itemSlots, setItemSlots] = useState(
		initialState?.itemSlots || Array(SLOT_SIZES.item).fill(null)
	);
	const [notes, setNotes] = useState(initialState?.notes || {});
	const [isRelicPanelOpen, setIsRelicPanelOpen] = useState(false);
	const [isPowerPanelOpen, setIsPowerPanelOpen] = useState(false);
	const [isItemPanelOpen, setIsItemPanelOpen] = useState(false);
	const [isChampionPanelOpen, setIsChampionPanelOpen] = useState(false);
	const [hasLiked, setHasLiked] = useState(false);
	const [likes, setLikes] = useState(defaultLikes);
	const [commentData, setCommentData] = useState([]);
	const [userName, setUserName] = useState("");
	const [newComment, setNewComment] = useState("");

	// Load champion data from API and set the first champion on initial load
	useEffect(() => {
		const loadChampionData = async () => {
			try {
				const response = await axios.get("http://localhost:5000/api/champions");
				const data = response.data;
				setChampionData(data);

				if (data.length > 0 && !selectedChampion.name) {
					setSelectedChampion(data[0]);
				}
			} catch (error) {
				console.error("Error loading champion list:", error);
				alert("Không thể tải danh sách tướng. Vui lòng thử lại sau.");
			}
		};

		loadChampionData();
	});

	// Load champion details when selectedChampion changes
	useEffect(() => {
		const loadChampionDetails = async () => {
			if (!selectedChampion.name) return;

			try {
				const response = await axios.get(
					`http://localhost:5000/api/get-champion/${selectedChampion.name}`
				);
				const data = response.data;

				if (data) {
					const { relicSets, powerSlots, defaultPowerSlots, itemSlots } =
						initializeChampionState(data);
					setRelicSets(relicSets);
					setPowerSlots(powerSlots);
					setDefaultPowerSlots(defaultPowerSlots);
					setItemSlots(itemSlots);
					setNotes(prev => ({
						...prev,
						[selectedChampion.name]: data.note || "",
					}));
					// Kiểm tra và chuẩn hóa dữ liệu like từ backend
					const receivedLikes = data.like?.[0];
					if (
						receivedLikes &&
						typeof receivedLikes === "object" &&
						["set1", "set2", "set3", "set4", "set5", "set6"].every(
							key => typeof receivedLikes[key] === "number"
						)
					) {
						setLikes(receivedLikes);
					} else {
						setLikes(defaultLikes);
						console.warn(
							`Dữ liệu like của ${selectedChampion.name} không hợp lệ, sử dụng giá trị mặc định.`
						);
					}
					setHasLiked(false);
				} else {
					console.warn(
						`Champion data for ${selectedChampion.name} not found, using default state.`
					);
				}
			} catch (error) {
				if (error.response && error.response.status === 404) {
					console.warn(
						`Champion ${selectedChampion.name} not found on server, using default state.`
					);
				} else {
					console.error("Error loading champion details:", error);
					alert("Không thể tải chi tiết tướng. Vui lòng thử lại sau.");
				}
			}
		};

		loadChampionDetails();
	}, [selectedChampion.name]);

	// Load comments when selectedChampion changes
	useEffect(() => {
		const loadComments = async () => {
			if (!selectedChampion.name) return;

			try {
				const response = await axios.get("http://localhost:5000/api/comments");
				setCommentData(response.data);
			} catch (error) {
				console.error("Error loading comments:", error);
				alert("Không thể tải bình luận. Vui lòng thử lại sau.");
			}
		};

		loadComments();
	}, [selectedChampion.name]);

	// Handle like button click
	const handleLike = async setNumber => {
		if (hasLiked) {
			alert("Bạn đã nhấn thích rồi! Mỗi phiên chỉ được thích một lần.");
			return;
		}

		const originalLikes = { ...likes }; // Lưu trạng thái ban đầu để khôi phục nếu lỗi
		const updatedLikes = {
			...likes,
			[`set${setNumber}`]: (likes[`set${setNumber}`] || 0) + 1,
		};

		// Cập nhật trạng thái UI trước
		setLikes(updatedLikes);
		setHasLiked(true);

		// Lưu trạng thái vào object để gửi lên server
		const state = {
			selectedChampion,
			likes: updatedLikes,
			hasLiked: true,
		};

		try {
			const response = await axios.post(
				"http://localhost:5000/api/like-champion",
				{
					championName: selectedChampion.name,
					like: updatedLikes,
				}
			);

			// Lưu trạng thái vào localStorage sau khi server phản hồi thành công
			localStorage.setItem("championConfig", JSON.stringify(state));
			alert(response.data.message);
		} catch (error) {
			// Khôi phục trạng thái nếu có lỗi
			setLikes(originalLikes);
			setHasLiked(false);
			console.error(
				"Lỗi khi lưu lượt thích:",
				error.message,
				error.response ? error.response.data : "Không có phản hồi từ server"
			);

			// Xử lý lỗi cụ thể
			if (error.response) {
				if (error.response.status === 400) {
					alert("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
				} else if (error.response.status === 404) {
					alert("Không tìm thấy tướng để cập nhật lượt thích.");
				} else {
					alert(
						`Lỗi khi lưu lượt thích: ${
							error.response.data.message || "Không xác định"
						}`
					);
				}
			} else {
				alert("Không thể kết nối đến server. Vui lòng thử lại sau.");
			}
		}
	};

	// Handle add comment
	const handleAddComment = async () => {
		if (!userName.trim() || !newComment.trim()) {
			alert("Vui lòng nhập đầy đủ tên và bình luận!");
			return;
		}

		try {
			const response = await axios.post("http://localhost:5000/api/comments", {
				userName,
				comment: newComment,
				championName: selectedChampion.name,
			});
			setCommentData([
				...commentData,
				{ userName, comment: newComment, championName: selectedChampion.name },
			]);
			setUserName("");
			setNewComment("");
			alert(response.data.message);
		} catch (error) {
			console.error("Error adding comment:", error);
			alert("Lỗi khi gửi bình luận. Vui lòng thử lại sau.");
		}
	};

	// Memoized getItemImage
	const getItemImage = useCallback(item => {
		if (!item?.name || !item.type) {
			console.warn(`Invalid item: ${JSON.stringify(item)}`);
			return {
				assetAbsolutePath: "default-item.png",
				assetFullAbsolutePath: "default-item.png",
			};
		}

		const list =
			item.type === ITEM_TYPES.RELIC
				? relicList
				: item.type === ITEM_TYPES.POWER
				? powerList
				: itemList;

		const entry = list.find(entry => entry.name === item.name);
		if (!entry) {
			console.warn(`Item not found: ${item.name} (${item.type})`);
			return {
				assetAbsolutePath: "default-item.png",
				assetFullAbsolutePath: "default-item.png",
			};
		}

		return {
			assetAbsolutePath: entry.assetAbsolutePath || "default-item.png",
			assetFullAbsolutePath:
				entry.assetFullAbsolutePath ||
				entry.assetAbsolutePath ||
				"default-item.png",
		};
	}, []);

	// Utility functions
	const updateSlots = (
		setNumber,
		slotIndex,
		newItem,
		removeFromSource = false,
		sourceSet = null,
		sourceIndex = null
	) => {
		const updateState = (setter, prev) => {
			if (setNumber <= 6) {
				return {
					...prev,
					[setNumber]: prev[setNumber].map((slot, idx) =>
						idx === slotIndex ? newItem : slot
					),
				};
			}
			return prev.map((slot, idx) => (idx === slotIndex ? newItem : slot));
		};

		if (setNumber <= 6) {
			setRelicSets(prev => updateState(setRelicSets, prev));
		} else if (setNumber === 7) {
			setPowerSlots(prev => updateState(setPowerSlots, prev));
		} else if (setNumber === 8) {
			setItemSlots(prev => updateState(setItemSlots, prev));
		} else if (setNumber === 9) {
			setDefaultPowerSlots(prev => updateState(setDefaultPowerSlots, prev));
		}

		if (removeFromSource && sourceSet && sourceIndex !== undefined) {
			if (sourceSet <= 6) {
				setRelicSets(prev => ({
					...prev,
					[sourceSet]: prev[sourceSet].map((slot, idx) =>
						idx === sourceIndex ? null : slot
					),
				}));
			} else if (sourceSet === 7) {
				setPowerSlots(prev =>
					prev.map((slot, idx) => (idx === sourceIndex ? null : slot))
				);
			} else if (sourceSet === 8) {
				setItemSlots(prev =>
					prev.map((slot, idx) => (idx === sourceIndex ? null : slot))
				);
			} else if (sourceSet === 9) {
				setDefaultPowerSlots(prev =>
					prev.map((slot, idx) => (idx === sourceIndex ? null : slot))
				);
			}
		}
	};

	// Event handlers
	const handleDragStart = (e, itemName, itemType, sourceSet, sourceIndex) => {
		e.dataTransfer.setData(
			"text/plain",
			JSON.stringify({ name: itemName, type: itemType, sourceSet, sourceIndex })
		);
	};

	const handleDrop = (e, slotIndex, setNumber) => {
		e.preventDefault();
		const data = e.dataTransfer.getData("text/plain");
		if (!data) return;

		const { name, type, sourceSet, sourceIndex } = JSON.parse(data);
		if (
			(setNumber <= 6 && type !== ITEM_TYPES.RELIC) ||
			((setNumber === 7 || setNumber === 9) && type !== ITEM_TYPES.POWER) ||
			(setNumber === 8 && type !== ITEM_TYPES.ITEM)
		) {
			return;
		}

		updateSlots(
			setNumber,
			slotIndex,
			{ name, type },
			true,
			sourceSet,
			sourceIndex
		);
	};

	const handleRemoveItem = (slotIndex, setNumber) => {
		updateSlots(setNumber, slotIndex, null);
	};

	const handleNoteChange = (e, championName) => {
		setNotes(prev => ({
			...prev,
			[championName]: e.target.value,
		}));
	};

	const togglePanel = type => {
		setIsRelicPanelOpen(type === "relic" ? !isRelicPanelOpen : false);
		setIsPowerPanelOpen(type === "power" ? !isPowerPanelOpen : false);
		setIsItemPanelOpen(type === "item" ? !isItemPanelOpen : false);
		setIsChampionPanelOpen(type === "champion" ? !isChampionPanelOpen : false);
	};

	const handleSelectChampion = champion => {
		setSelectedChampion(champion);
		setIsChampionPanelOpen(false);
	};

	const handleSaveToFile = async () => {
		const state = {
			selectedChampion,
			relicSets,
			powerSlots,
			defaultPowerSlots,
			itemSlots,
			notes,
			likes,
			hasLiked,
		};
		const formatSlots = slots => slots.map(slot => (slot ? slot.name : null));

		try {
			const response = await axios.post(
				"http://localhost:5000/api/save-champion",
				{
					championName: selectedChampion.name,
					defaultRelicsSet1: formatSlots(relicSets[1]),
					defaultRelicsSet2: formatSlots(relicSets[2]),
					defaultRelicsSet3: formatSlots(relicSets[3]),
					defaultRelicsSet4: formatSlots(relicSets[4]),
					defaultRelicsSet5: formatSlots(relicSets[5]),
					defaultRelicsSet6: formatSlots(relicSets[6]),
					defaultAdventurePower: formatSlots(powerSlots),
					defaultPowers: formatSlots(defaultPowerSlots),
					defaultItems: formatSlots(itemSlots),
					note: notes[selectedChampion.name] || "",
				}
			);
			alert(response.data.message);

			// Save to localStorage for next reload
			localStorage.setItem("championConfig", JSON.stringify(state));
		} catch (error) {
			console.error(
				"Lỗi chi tiết:",
				error.message,
				error.response ? error.response.data : "Không có phản hồi từ server"
			);
			alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
		}
	};

	return (
		<>
			<div id='Screen'>
				<div className='CanhBao'>
					Tui không biết FIX BUG đâu nên xin đừng phá!
				</div>
				<div id='mainView'>
					<img
						loading='lazy'
						id='selectChamp'
						src={selectedChampion.assets?.[0]?.fullAbsolutePath || ""}
						alt={selectedChampion.name || "No Champion"}
					/>
					<img
						id='picChamp'
						src={selectedChampion.assets?.[0]?.gameAbsolutePath || ""}
						loading='lazy'
					/>
					<button
						className='open-relic-panel'
						onClick={() => togglePanel("relic")}
					>
						{isRelicPanelOpen ? "Đóng Danh Sách Cổ Vật" : "Mở Danh Sách Cổ Vật"}
					</button>
					<button
						className='open-power-panel'
						onClick={() => togglePanel("power")}
					>
						{isPowerPanelOpen
							? "Đóng Danh Sách Sức Mạnh"
							: "Mở Danh Sách Sức Mạnh"}
					</button>
					<button
						className='open-item-panel'
						onClick={() => togglePanel("item")}
					>
						{isItemPanelOpen
							? "Đóng Danh Sách Vật Phẩm"
							: "Mở Danh Sách Vật Phẩm"}
					</button>
					<button
						className='open-champion-panel'
						onClick={() => togglePanel("champion")}
					>
						{isChampionPanelOpen
							? "Đóng Danh Sách Tướng"
							: "Mở Danh Sách Tướng"}
					</button>
					<button className='save-defaults-btn' onClick={handleSaveToFile}>
						Lưu
					</button>

					<div id='relic-sets'>
						{[1, 2, 3, 4, 5, 6].map(setNumber => (
							<RelicSet
								key={setNumber}
								setNumber={setNumber}
								relicSets={relicSets}
								handleDrop={handleDrop}
								handleDragStart={handleDragStart}
								handleRemoveItem={handleRemoveItem}
								getItemImage={getItemImage}
								handleLike={handleLike}
								hasLiked={hasLiked}
								likes={likes}
							/>
						))}
					</div>

					<div id='power-set'>
						<PowerSet
							powerSlots={powerSlots}
							handleDrop={handleDrop}
							handleDragStart={handleDragStart}
							handleRemoveItem={handleRemoveItem}
							getItemImage={getItemImage}
						/>
					</div>

					<div id='item-set'>
						<ItemSet
							itemSlots={itemSlots}
							handleDrop={handleDrop}
							handleDragStart={handleDragStart}
							handleRemoveItem={handleRemoveItem}
							getItemImage={getItemImage}
						/>
					</div>

					<div id='default-powers'>
						<DefaultPowerSet
							defaultPowerSlots={defaultPowerSlots}
							handleDrop={handleDrop}
							handleDragStart={handleDragStart}
							handleRemoveItem={handleRemoveItem}
							getItemImage={getItemImage}
						/>
					</div>

					<div id='note-set'>
						<NoteSet
							notes={notes}
							selectedChampion={selectedChampion}
							handleNoteChange={handleNoteChange}
						/>
					</div>

					<div id='comment-set'>
						<CommentSet
							comments={commentData}
							championName={selectedChampion.name}
							userName={userName}
							setUserName={setUserName}
							newComment={newComment}
							setNewComment={setNewComment}
							handleAddComment={handleAddComment}
						/>
					</div>
				</div>
			</div>

			<div className={`relic-panel ${isRelicPanelOpen ? "open" : ""}`}>
				<div className='relic-panel-content'>
					<h3>Danh sách Cổ Vật</h3>
					<button
						className='close-relic-panel'
						onClick={() => togglePanel("relic")}
					>
						Đóng
					</button>
					<div className='relic-list'>
						{sortedRelicList.map((relic, index) => (
							<img
								key={index}
								loading='lazy'
								className='iconRelic draggable'
								src={
									getItemImage({
										name: relic.name,
										type: ITEM_TYPES.RELIC,
									}).assetAbsolutePath
								}
								alt={relic.name}
								draggable
								onDragStart={e =>
									handleDragStart(e, relic.name, ITEM_TYPES.RELIC)
								}
							/>
						))}
					</div>
				</div>
			</div>

			<div className={`power-panel ${isPowerPanelOpen ? "open" : ""}`}>
				<div className='power-panel-content'>
					<h3>Danh sách Sức Mạnh</h3>
					<button
						className='close-power-panel'
						onClick={() => togglePanel("power")}
					>
						Đóng
					</button>
					<div className='power-list'>
						{sortedPowerList.map((power, index) => (
							<img
								key={index}
								loading='lazy'
								className='iconPower draggable'
								src={
									getItemImage({
										name: power.name,
										type: ITEM_TYPES.POWER,
									}).assetAbsolutePath
								}
								alt={power.name}
								draggable
								onDragStart={e =>
									handleDragStart(e, power.name, ITEM_TYPES.POWER)
								}
							/>
						))}
					</div>
				</div>
			</div>

			<div className={`item-panel ${isItemPanelOpen ? "open" : ""}`}>
				<div className='item-panel-content'>
					<h3>Danh sách Vật Phẩm</h3>
					<button
						className='close-item-panel'
						onClick={() => togglePanel("item")}
					>
						Đóng
					</button>
					<div className='item-list'>
						{sortedItemList.map((item, index) => (
							<div key={index} className='item-list-item'>
								<img
									loading='lazy'
									className='iconItem draggable'
									src={
										getItemImage({
											name: item.name,
											type: ITEM_TYPES.ITEM,
										}).assetAbsolutePath
									}
									alt={item.name}
									draggable
									onDragStart={e =>
										handleDragStart(e, item.name, ITEM_TYPES.ITEM)
									}
								/>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className={`champion-panel ${isChampionPanelOpen ? "open" : ""}`}>
				<div className='champion-panel-content'>
					<h3>Danh sách Tướng</h3>
					<button
						className='close-champion-panel'
						onClick={() => togglePanel("champion")}
					>
						Đóng
					</button>
					<div className='champion-list'>
						{championData.map((champion, index) => (
							<div key={index} className='champion-list-item'>
								<ChampionCard
									champion={champion}
									onSelectChampion={handleSelectChampion}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}

export default App;
