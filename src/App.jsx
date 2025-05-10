import "./cssReset.css";
import "./App.css";
import iconRegionList from "./iconRegions";
import relicList from "./relics-vi_vn.json";
import powerList from "./powers-vi_vn.json";
import adventurePowerList from "./adventure-powers-vi_vn.json";
import itemList from "./items-vi_vn.json";
import { useState, useMemo, useCallback, useEffect } from "react";
import { memo } from "react";
import axios from "axios";

// Định nghĩa các hằng số cho số lượng slot và loại item
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

// Thứ tự ưu tiên độ hiếm
const rarityOrder = { Legendary: 1, Epic: 2, Rare: 3, Common: 4, Special: 5 };

// Danh sách độ hiếm cho bộ lọc
const RARITY_FILTERS = [
	{ value: "all", label: "TẤT CẢ" },
	{ value: "Common", label: "THƯỜNG" },
	{ value: "Rare", label: "HIẾM" },
	{ value: "Epic", label: "SỬ THI" },
];

// Giá trị mặc định cho lượt thích
const defaultLikes = { set1: 0, set2: 0, set3: 0, set4: 0, set5: 0, set6: 0 };

// Component hiển thị thẻ tướng riêng lẻ
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

// Component hiển thị slot cho cổ vật, sức mạnh, vật phẩm
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
		openPanel,
	}) => (
		<div
			className={`${type}-slot ${slot ? "filled" : ""}`}
			onDrop={e => handleDrop(e, slotIndex, setNumber)}
			onDragOver={e => e.preventDefault()}
			onClick={() => !slot && openPanel && openPanel(type)}
		>
			{slot ? (
				<div className={`${type}-slot-content`}>
					<img
						loading='lazy'
						className={`icon${type.charAt(0).toUpperCase() + type.slice(1)}`}
						src={getItemImage(slot, setNumber).assetAbsolutePath}
						alt={slot.name}
						draggable
						onDragStart={e =>
							handleDragStart(e, slot.name, type, setNumber, slotIndex)
						}
					/>
					<div className='tooltip'>
						<img
							loading='lazy'
							src={getItemImage(slot, setNumber).assetFullAbsolutePath}
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

// Component hiển thị bộ cổ vật
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
	openPanel,
}) => (
	<div className='relic-set'>
		<h2>Bộ {setNumber}</h2>
		<h2>
			<span>🤍 {likes[`set${setNumber}`] || 0}</span>
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
					openPanel={openPanel}
				/>
			))}
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

// Component hiển thị bộ sức mạnh phiêu lưu
const PowerSet = ({
	powerSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
	openPanel,
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
					openPanel={openPanel}
				/>
			))}
		</div>
	</div>
);

// Component hiển thị bộ vật phẩm
const ItemSet = ({
	itemSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
	openPanel,
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
					openPanel={openPanel}
				/>
			))}
		</div>
	</div>
);

// Component hiển thị bộ chòm sao
const DefaultPowerSet = ({
	defaultPowerSlots,
	handleDrop,
	handleDragStart,
	handleRemoveItem,
	getItemImage,
	openPanel,
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
					openPanel={openPanel}
				/>
			))}
		</div>
	</div>
);

// Component hiển thị ghi chú
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

// Component hiển thị bình luận
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

// Component hiển thị modal xác nhận
const ConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
	if (!isOpen) return null;

	return (
		<div className='modal-overlay'>
			<div className='modal-content'>
				<h3>Xác nhận lưu</h3>
				<p>Bạn có chắc chắn muốn lưu cấu hình này không?</p>
				<div className='modal-buttons'>
					<button className='modal-confirm-btn' onClick={onConfirm}>
						Xác nhận
					</button>
					<button className='modal-cancel-btn' onClick={onCancel}>
						Hủy
					</button>
				</div>
			</div>
		</div>
	);
};

// Hàm tìm link biểu tượng khu vực
function findRegionIconLink(regionIcon) {
	const item = iconRegionList.find(item => item.name === regionIcon);
	return item?.iconAbsolutePath || "default-icon.png";
}

// Hàm khởi tạo trạng thái ban đầu cho tướng
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

// Hàm lấy danh sách vật phẩm mặc định hợp lệ
const getValidDefaultItems = champion => {
	const defaultItems = Array.isArray(champion.defaultItems)
		? champion.defaultItems
		: [];
	return defaultItems
		.filter(name => itemList.some(item => item.name === name))
		.slice(0, SLOT_SIZES.item);
};

// Component chính của ứng dụng
function App() {
	// Sắp xếp danh sách cổ vật, sức mạnh, vật phẩm theo độ hiếm và tên
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

	// Tạo danh sách khu vực từ iconRegionList
	const regionFilters = useMemo(() => {
		const regions = [
			{ value: "all", label: "TẤT CẢ" },
			...iconRegionList.map(region => ({
				value: region.name,
				label: region.name.toUpperCase(),
			})),
		];
		return regions;
	}, []);

	// Khởi tạo trạng thái từ localStorage
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
	const [relicSearch, setRelicSearch] = useState("");
	const [powerSearch, setPowerSearch] = useState("");
	const [itemSearch, setItemSearch] = useState("");
	const [championSearch, setChampionSearch] = useState("");
	const [relicRarityFilter, setRelicRarityFilter] = useState("all");
	const [powerRarityFilter, setPowerRarityFilter] = useState("all");
	const [itemRarityFilter, setItemRarityFilter] = useState("all");
	const [regionFilter, setRegionFilter] = useState("all");
	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

	// Tải danh sách tướng từ API khi khởi động
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
				console.error("Lỗi tải danh sách tướng:", error);
				alert("Không thể tải danh sách tướng. Vui lòng thử lại sau.");
			}
		};

		loadChampionData();
	}, []);

	// Tải chi tiết tướng khi thay đổi tướng được chọn
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
					const receivedLikes = data.like?.[0] || defaultLikes;
					setLikes(receivedLikes);
					setHasLiked(false);
				}
			} catch (error) {
				console.error("Lỗi tải chi tiết tướng:", error);
				alert("Không thể tải chi tiết tướng. Vui lòng thử lại sau.");
			}
		};

		loadChampionDetails();
	}, [selectedChampion.name]);

	// Tải bình luận khi thay đổi tướng được chọn
	useEffect(() => {
		const loadComments = async () => {
			if (!selectedChampion.name) return;

			try {
				const response = await axios.get("http://localhost:5000/api/comments");
				setCommentData(response.data);
			} catch (error) {
				console.error("Lỗi tải bình luận:", error);
				alert("Không thể tải bình luận. Vui lòng thử lại sau.");
			}
		};

		loadComments();
	}, [selectedChampion.name]);

	// Lọc danh sách cổ vật dựa trên tìm kiếm và độ hiếm
	const filteredRelicList = useMemo(() => {
		return sortedRelicList.filter(relic => {
			const matchesSearch = relic.name
				.toLowerCase()
				.includes(relicSearch.toLowerCase());
			const matchesRarity =
				relicRarityFilter === "all" || relic.rarityRef === relicRarityFilter;
			return matchesSearch && matchesRarity;
		});
	}, [sortedRelicList, relicSearch, relicRarityFilter]);

	// Lọc danh sách sức mạnh dựa trên tìm kiếm và độ hiếm
	const filteredPowerList = useMemo(() => {
		return sortedPowerList.filter(power => {
			const matchesSearch = power.name
				.toLowerCase()
				.includes(powerSearch.toLowerCase());
			const matchesRarity =
				powerRarityFilter === "all" || power.rarityRef === powerRarityFilter;
			return matchesSearch && matchesRarity;
		});
	}, [sortedPowerList, powerSearch, powerRarityFilter]);

	// Lọc danh sách vật phẩm dựa trên tìm kiếm và độ hiếm
	const filteredItemList = useMemo(() => {
		return sortedItemList.filter(item => {
			const matchesSearch = item.name
				.toLowerCase()
				.includes(itemSearch.toLowerCase());
			const matchesRarity =
				itemRarityFilter === "all" || item.rarityRef === itemRarityFilter;
			return matchesSearch && matchesRarity;
		});
	}, [sortedItemList, itemSearch, itemRarityFilter]);

	// Lọc danh sách tướng dựa trên tìm kiếm và khu vực
	const filteredChampionList = useMemo(() => {
		return championData.filter(champion => {
			const matchesSearch = champion.name
				.toLowerCase()
				.includes(championSearch.toLowerCase());
			const matchesRegion =
				regionFilter === "all" ||
				(champion.regions && champion.regions.includes(regionFilter));
			return matchesSearch && matchesRegion;
		});
	}, [championData, championSearch, regionFilter]);

	// Xử lý sự kiện nhấn nút thích
	const handleLike = useCallback(
		async setNumber => {
			if (hasLiked) {
				alert("Bạn đã nhấn thích rồi! Mỗi phiên chỉ được thích một lần.");
				return;
			}

			const updatedLikes = {
				...likes,
				[`set${setNumber}`]: (likes[`set${setNumber}`] || 0) + 1,
			};

			setLikes(updatedLikes);
			setHasLiked(true);

			try {
				const response = await axios.post(
					"http://localhost:5000/api/like-champion",
					{
						championName: selectedChampion.name,
						like: updatedLikes,
					}
				);

				localStorage.setItem(
					"championConfig",
					JSON.stringify({
						selectedChampion,
						likes: updatedLikes,
						hasLiked: true,
					})
				);
				alert(response.data.message);
			} catch (error) {
				setLikes(likes);
				setHasLiked(false);
				console.error("Lỗi khi lưu lượt thích:", error);
				alert("Lỗi khi lưu lượt thích. Vui lòng thử lại sau.");
			}
		},
		[hasLiked, likes, selectedChampion.name]
	);

	// Xử lý thêm bình luận
	const handleAddComment = useCallback(async () => {
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
			console.error("Lỗi khi gửi bình luận:", error);
			alert("Lỗi khi gửi bình luận. Vui lòng thử lại sau.");
		}
	}, [userName, newComment, selectedChampion.name, commentData]);

	// Lấy hình ảnh của item
	const getItemImage = useCallback((item, setNumber) => {
		if (!item?.name || !item.type) {
			return {
				assetAbsolutePath: "default-item.png",
				assetFullAbsolutePath: "default-item.png",
			};
		}

		let list;
		if (item.type === ITEM_TYPES.RELIC) {
			list = relicList;
		} else if (item.type === ITEM_TYPES.POWER) {
			list = setNumber === 7 ? adventurePowerList : powerList;
		} else {
			list = itemList;
		}

		const entry = list.find(entry => entry.name === item.name);
		return {
			assetAbsolutePath: entry?.assetAbsolutePath || "default-item.png",
			assetFullAbsolutePath:
				entry?.assetFullAbsolutePath ||
				entry?.assetAbsolutePath ||
				"default-item.png",
		};
	}, []);

	// Cập nhật slot khi kéo thả hoặc xóa item
	const updateSlots = useCallback(
		(
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
		},
		[]
	);

	// Xử lý sự kiện bắt đầu kéo
	const handleDragStart = useCallback(
		(e, itemName, itemType, sourceSet, sourceIndex) => {
			e.dataTransfer.setData(
				"text/plain",
				JSON.stringify({
					name: itemName,
					type: itemType,
					sourceSet,
					sourceIndex,
				})
			);
		},
		[]
	);

	// Xử lý sự kiện thả item
	const handleDrop = useCallback(
		(e, slotIndex, setNumber) => {
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
		},
		[updateSlots]
	);

	// Xử lý xóa item khỏi slot
	const handleRemoveItem = useCallback(
		(slotIndex, setNumber) => {
			updateSlots(setNumber, slotIndex, null);
		},
		[updateSlots]
	);

	// Xử lý thay đổi ghi chú
	const handleNoteChange = useCallback((e, championName) => {
		setNotes(prev => ({
			...prev,
			[championName]: e.target.value,
		}));
	}, []);

	// Bật/tắt panel tương ứng
	const togglePanel = useCallback(type => {
		if (type === "relic") {
			setIsRelicPanelOpen(prev => !prev);
			setIsPowerPanelOpen(false);
			setIsItemPanelOpen(false);
			setIsChampionPanelOpen(false);
		} else if (type === "power") {
			setIsPowerPanelOpen(prev => !prev);
			setIsRelicPanelOpen(false);
			setIsItemPanelOpen(false);
			setIsChampionPanelOpen(false);
		} else if (type === "item") {
			setIsItemPanelOpen(prev => !prev);
			setIsRelicPanelOpen(false);
			setIsPowerPanelOpen(false);
			setIsChampionPanelOpen(false);
		} else if (type === "champion") {
			setIsChampionPanelOpen(prev => !prev);
			setIsRelicPanelOpen(false);
			setIsPowerPanelOpen(false);
			setIsItemPanelOpen(false);
		}
	}, []);

	// Xử lý chọn tướng
	const handleSelectChampion = useCallback(champion => {
		setSelectedChampion(champion);
		setIsChampionPanelOpen(false);
	}, []);

	// Xử lý xác nhận lưu
	const handleConfirmSave = useCallback(async () => {
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
			localStorage.setItem("championConfig", JSON.stringify(state));
		} catch (error) {
			console.error("Lỗi khi lưu dữ liệu:", error);
			alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
		} finally {
			setIsConfirmModalOpen(false);
		}
	}, [
		selectedChampion,
		relicSets,
		powerSlots,
		defaultPowerSlots,
		itemSlots,
		notes,
		likes,
		hasLiked,
	]);

	// Xử lý hủy lưu
	const handleCancelSave = useCallback(() => {
		setIsConfirmModalOpen(false);
	}, []);

	// Xử lý nhấn nút lưu
	const handleSaveToFile = useCallback(() => {
		setIsConfirmModalOpen(true);
	}, []);

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
								openPanel={togglePanel}
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
							openPanel={togglePanel}
						/>
					</div>

					<div id='item-set'>
						<ItemSet
							itemSlots={itemSlots}
							handleDrop={handleDrop}
							handleDragStart={handleDragStart}
							handleRemoveItem={handleRemoveItem}
							getItemImage={getItemImage}
							openPanel={togglePanel}
						/>
					</div>

					<div id='default-powers'>
						<DefaultPowerSet
							defaultPowerSlots={defaultPowerSlots}
							handleDrop={handleDrop}
							handleDragStart={handleDragStart}
							handleRemoveItem={handleRemoveItem}
							getItemImage={getItemImage}
							openPanel={togglePanel}
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

					<ConfirmModal
						isOpen={isConfirmModalOpen}
						onConfirm={handleConfirmSave}
						onCancel={handleCancelSave}
					/>
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
					<div className='panel-controls'>
						<input
							type='text'
							className='search-input'
							placeholder='Tìm kiếm cổ vật...'
							value={relicSearch}
							onChange={e => setRelicSearch(e.target.value)}
						/>
						<select
							className='rarity-filter'
							value={relicRarityFilter}
							onChange={e => setRelicRarityFilter(e.target.value)}
						>
							{RARITY_FILTERS.map(filter => (
								<option key={filter.value} value={filter.value}>
									{filter.label}
								</option>
							))}
						</select>
					</div>
					<div className='relic-list'>
						{filteredRelicList.map((relic, index) => (
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
					<div className='panel-controls'>
						<input
							type='text'
							className='search-input'
							placeholder='Tìm kiếm sức mạnh...'
							value={powerSearch}
							onChange={e => setPowerSearch(e.target.value)}
						/>
						<select
							className='rarity-filter'
							value={powerRarityFilter}
							onChange={e => setPowerRarityFilter(e.target.value)}
						>
							{RARITY_FILTERS.map(filter => (
								<option key={filter.value} value={filter.value}>
									{filter.label}
								</option>
							))}
						</select>
					</div>
					<div className='power-list'>
						{filteredPowerList.map((power, index) => (
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
					<div className='panel-controls'>
						<input
							type='text'
							className='search-input'
							placeholder='Tìm kiếm vật phẩm...'
							value={itemSearch}
							onChange={e => setItemSearch(e.target.value)}
						/>
						<select
							className='rarity-filter'
							value={itemRarityFilter}
							onChange={e => setItemRarityFilter(e.target.value)}
						>
							{RARITY_FILTERS.map(filter => (
								<option key={filter.value} value={filter.value}>
									{filter.label}
								</option>
							))}
						</select>
					</div>
					<div className='item-list'>
						{filteredItemList.map((item, index) => (
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
					<div className='panel-controls'>
						<input
							type='text'
							className='search-input'
							placeholder='Tìm kiếm tướng...'
							value={championSearch}
							onChange={e => setChampionSearch(e.target.value)}
						/>
						<select
							className='region-filter'
							value={regionFilter}
							onChange={e => setRegionFilter(e.target.value)}
						>
							{regionFilters.map(region => (
								<option key={region.value} value={region.value}>
									{region.label}
								</option>
							))}
						</select>
					</div>
					<div className='champion-list'>
						{filteredChampionList.map((champion, index) => (
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
