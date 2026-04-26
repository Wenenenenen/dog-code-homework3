// 数据模型
class Room {
    constructor(id, number, type, capacity) {
        this.id = id;
        this.number = number;
        this.type = type; // '猫房', '小型犬房', '大型犬房'
        this.capacity = capacity;
    }
}

class Order {
    constructor(id, petName, petType, petSize, checkInDate, checkOutDate, ownerName, roomId) {
        this.id = id;
        this.petName = petName;
        this.petType = petType; // '猫', '狗'
        this.petSize = petSize; // '小型', '大型' (仅狗有)
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.ownerName = ownerName;
        this.roomId = roomId;
        this.checkedOut = false; // 是否已办理离店
    }

    // 获取今天的日期字符串（YYYY-MM-DD格式）
    static getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 根据日期动态获取订单状态
    getStatus() {
        if (this.checkedOut) {
            return '已离店';
        }

        const todayStr = Order.getTodayString();

        // 直接比较字符串（YYYY-MM-DD格式可以直接比较）
        if (todayStr < this.checkInDate) {
            return '待入住';
        } else if (todayStr > this.checkOutDate) {
            return '已过期';
        } else {
            return '入住中';
        }
    }

    // 判断订单是否正在入住中（用于房间容量计算）
    isCurrentlyCheckedIn() {
        if (this.checkedOut) {
            return false;
        }

        const todayStr = Order.getTodayString();

        // 只有当今天在入住日期和离店日期之间（包括当天）才算入住中
        return todayStr >= this.checkInDate && todayStr <= this.checkOutDate;
    }
}

// 数据管理类
class DataManager {
    constructor() {
        this.rooms = this.loadRooms();
        this.orders = this.loadOrders();
    }

    // 初始化默认房间数据
    loadRooms() {
        const savedRooms = localStorage.getItem('petHotelRooms');
        if (savedRooms) {
            return JSON.parse(savedRooms);
        }

        // 默认房间数据
        const defaultRooms = [
            new Room(1, '101', '猫房', 3),
            new Room(2, '102', '猫房', 2),
            new Room(3, '103', '猫房', 4),
            new Room(4, '201', '小型犬房', 2),
            new Room(5, '202', '小型犬房', 3),
            new Room(6, '203', '小型犬房', 2),
            new Room(7, '301', '大型犬房', 1),
            new Room(8, '302', '大型犬房', 1),
            new Room(9, '303', '大型犬房', 2)
        ];

        localStorage.setItem('petHotelRooms', JSON.stringify(defaultRooms));
        return defaultRooms;
    }

    loadOrders() {
        const savedOrders = localStorage.getItem('petHotelOrders');
        if (savedOrders) {
            return JSON.parse(savedOrders);
        }
        return [];
    }

    saveRooms() {
        localStorage.setItem('petHotelRooms', JSON.stringify(this.rooms));
    }

    saveOrders() {
        localStorage.setItem('petHotelOrders', JSON.stringify(this.orders));
    }

    addOrder(order) {
        this.orders.push(order);
        this.saveOrders();
    }

    checkoutOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.checkedOut = true;
            order.status = '已离店'; // 兼容旧数据格式
            this.saveOrders();
        }
    }

    getRoomCurrentOccupancy(roomId) {
        return this.orders.filter(o => 
            o.roomId === roomId && this.isOrderCurrentlyCheckedIn(o)
        ).length;
    }

    // 获取今天的日期字符串（YYYY-MM-DD格式）
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 辅助方法：判断订单是否已离店（兼容旧数据格式）
    isOrderCheckedOut(order) {
        // 新格式：checkedOut: true
        if (order.checkedOut === true) return true;
        // 旧格式：status: '已离店'
        if (order.status === '已离店') return true;
        // 其他情况：未离店
        return false;
    }

    // 辅助方法：判断订单是否正在入住中
    isOrderCurrentlyCheckedIn(order) {
        // 从 localStorage 加载的对象不是 Order 实例，需要手动处理
        if (this.isOrderCheckedOut(order)) {
            return false;
        }

        const todayStr = this.getTodayString();

        return todayStr >= order.checkInDate && todayStr <= order.checkOutDate;
    }

    // 获取订单状态（处理从 localStorage 加载的对象）
    getOrderStatus(order) {
        if (this.isOrderCheckedOut(order)) {
            return '已离店';
        }

        const todayStr = this.getTodayString();

        if (todayStr < order.checkInDate) {
            return '待入住';
        } else if (todayStr > order.checkOutDate) {
            return '已过期';
        } else {
            return '入住中';
        }
    }

    // 检查两个时间段是否有重叠
    // 注意：同一天的离店和入住不被认为是重叠的（例如：4.26-4.27 和 4.27-4.28 不重叠）
    doDateRangesOverlap(checkIn1, checkOut1, checkIn2, checkOut2) {
        // 时间段1: checkIn1 到 checkOut1
        // 时间段2: checkIn2 到 checkOut2
        // 两个时间段不重叠的情况：checkOut1 <= checkIn2 或 checkOut2 <= checkIn1
        // 所以重叠的情况就是：!(checkOut1 <= checkIn2 或 checkOut2 <= checkIn1)
        return !(checkOut1 <= checkIn2 || checkOut2 <= checkIn1);
    }

    // 获取房间在指定时间段内的可用容量
    getRoomCapacityForDateRange(roomId, checkInDate, checkOutDate) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return 0;

        // 统计同一时间段内的订单数量（包括当前入住中、待入住的）
        const overlappingOrders = this.orders.filter(order => {
            // 只考虑未离店的订单
            if (this.isOrderCheckedOut(order)) return false;
            // 检查时间段是否重叠
            return this.doDateRangesOverlap(
                checkInDate, checkOutDate,
                order.checkInDate, order.checkOutDate
            );
        });

        return room.capacity - overlappingOrders.length;
    }

    // 获取房间当前可用容量（保留原方法用于其他地方）
    getRoomAvailableCapacity(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return 0;
        return room.capacity - this.getRoomCurrentOccupancy(roomId);
    }

    getAvailableRooms(petType, petSize, checkInDate = null, checkOutDate = null) {
        // 根据宠物类型和体型筛选房间
        let targetRoomTypes = [];

        if (petType === '猫') {
            targetRoomTypes = ['猫房'];
        } else if (petType === '狗') {
            if (petSize === '小型') {
                targetRoomTypes = ['小型犬房'];
            } else if (petSize === '大型') {
                targetRoomTypes = ['大型犬房'];
            }
        }

        // 筛选房间类型
        const filteredRooms = this.rooms.filter(room => {
            return targetRoomTypes.includes(room.type);
        });

        // 如果提供了日期范围，检查该时间段内的可用容量
        if (checkInDate && checkOutDate) {
            return filteredRooms.filter(room => {
                const hasCapacity = this.getRoomCapacityForDateRange(room.id, checkInDate, checkOutDate) > 0;
                return hasCapacity;
            });
        }

        // 如果没有提供日期范围，使用原有的逻辑（检查当前可用容量）
        return filteredRooms.filter(room => {
            const hasCapacity = this.getRoomAvailableCapacity(room.id) > 0;
            return hasCapacity;
        });
    }

    getRoomById(roomId) {
        return this.rooms.find(r => r.id === roomId);
    }

    getOrdersByRoomId(roomId) {
        // 返回该房间所有未离店的订单（包括待入住、入住中、已过期）
        return this.orders.filter(o => 
            o.roomId === roomId && !this.isOrderCheckedOut(o)
        );
    }
}

// 应用类
class PetHotelApp {
    constructor() {
        this.dataManager = new DataManager();
        this.currentRoomId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderRoomList();
        this.setDefaultDates();
    }

    bindEvents() {
        // 新增订单按钮
        document.getElementById('addOrderBtn').addEventListener('click', () => {
            this.openOrderModal();
        });

        // 关闭模态框
        document.querySelector('.close').addEventListener('click', () => {
            this.closeOrderModal();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('orderModal');
            if (event.target === modal) {
                this.closeOrderModal();
            }
        });

        // 表单提交
        document.getElementById('orderForm').addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitOrder();
        });

        // 宠物类型变化
        document.getElementById('petType').addEventListener('change', () => {
            this.updatePetSizeVisibility();
            this.updateAvailableRooms();
        });

        // 宠物体型变化
        document.getElementById('petSize').addEventListener('change', () => {
            this.updateAvailableRooms();
        });

        // 入住日期变化
        document.getElementById('checkInDate').addEventListener('change', () => {
            this.updateAvailableRooms();
        });

        // 离店日期变化
        document.getElementById('checkOutDate').addEventListener('change', () => {
            this.updateAvailableRooms();
        });

        // 返回房间列表按钮
        document.getElementById('backToListBtn').addEventListener('click', () => {
            this.showRoomList();
        });
    }

    // 获取今天的日期字符串（YYYY-MM-DD格式，本地时间）
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 获取明天的日期字符串（YYYY-MM-DD格式，本地时间）
    getTomorrowString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    setDefaultDates() {
        const todayStr = this.getTodayString();
        const tomorrowStr = this.getTomorrowString();

        // 设置最小日期为今天，禁止选择过去的日期
        document.getElementById('checkInDate').min = todayStr;
        document.getElementById('checkOutDate').min = todayStr;

        // 入住日期默认为今天
        document.getElementById('checkInDate').value = todayStr;
        // 离店日期默认为明天
        document.getElementById('checkOutDate').value = tomorrowStr;
    }

    updatePetSizeVisibility() {
        const petType = document.getElementById('petType').value;
        const petSizeGroup = document.getElementById('petSizeGroup');

        if (petType === '狗') {
            petSizeGroup.style.display = 'block';
            document.getElementById('petSize').required = true;
        } else {
            petSizeGroup.style.display = 'none';
            document.getElementById('petSize').required = false;
            document.getElementById('petSize').value = '';
        }
    }

    updateAvailableRooms() {
        const petType = document.getElementById('petType').value;
        const petSize = document.getElementById('petSize').value;
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const availableRoomsSelect = document.getElementById('availableRooms');

        // 清空现有选项
        availableRoomsSelect.innerHTML = '';

        // 如果没有选择宠物类型或（狗且没有选择体型），则禁用
        if (!petType || (petType === '狗' && !petSize)) {
            availableRoomsSelect.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '请先选择宠物类型和体型';
            availableRoomsSelect.appendChild(option);
            return;
        }

        // 如果没有选择日期，禁用
        if (!checkInDate || !checkOutDate) {
            availableRoomsSelect.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '请选择入住和离店日期';
            availableRoomsSelect.appendChild(option);
            return;
        }

        // 获取可用房间（考虑时间段重叠）
        const availableRooms = this.dataManager.getAvailableRooms(
            petType, petSize, checkInDate, checkOutDate
        );

        if (availableRooms.length === 0) {
            availableRoomsSelect.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '该时间段暂无可用房间';
            availableRoomsSelect.appendChild(option);
            return;
        }

        // 启用选择框并填充选项
        availableRoomsSelect.disabled = false;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择房间';
        availableRoomsSelect.appendChild(defaultOption);

        availableRooms.forEach(room => {
            // 获取该时间段内的可用容量
            const availableCapacity = this.dataManager.getRoomCapacityForDateRange(
                room.id, checkInDate, checkOutDate
            );
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `${room.number} (${room.type}) - 该时间段剩余容量: ${availableCapacity}`;
            availableRoomsSelect.appendChild(option);
        });
    }

    openOrderModal() {
        document.getElementById('orderModal').classList.remove('hidden');
        this.resetOrderForm();
    }

    closeOrderModal() {
        document.getElementById('orderModal').classList.add('hidden');
        this.resetOrderForm();
    }

    resetOrderForm() {
        document.getElementById('orderForm').reset();
        this.setDefaultDates();
        this.updatePetSizeVisibility();
        this.updateAvailableRooms();
    }

    submitOrder() {
        const petName = document.getElementById('petName').value.trim();
        const petType = document.getElementById('petType').value;
        const petSize = document.getElementById('petSize').value;
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const ownerName = document.getElementById('ownerName').value.trim();
        const roomId = parseInt(document.getElementById('availableRooms').value);

        // 验证
        if (!petName || !petType || !checkInDate || !checkOutDate || !ownerName || !roomId) {
            alert('请填写所有必填字段并选择房间');
            return;
        }

        // 验证入住日期不能早于今天
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        
        if (checkIn < today) {
            alert('入住日期不能早于今天');
            return;
        }

        // 验证离店日期不早于入住日期
        if (checkOut < checkIn) {
            alert('离店日期不能早于入住日期');
            return;
        }

        // 验证狗必须选择体型
        if (petType === '狗' && !petSize) {
            alert('请选择宠物体型');
            return;
        }

        // 再次验证房间容量（考虑时间段重叠）
        const availableCapacity = this.dataManager.getRoomCapacityForDateRange(
            roomId, checkInDate, checkOutDate
        );
        if (availableCapacity <= 0) {
            alert('该时间段所选房间容量不足，请重新选择');
            this.updateAvailableRooms();
            return;
        }

        // 创建订单
        const orderId = Date.now(); // 使用时间戳作为订单ID
        const order = new Order(
            orderId,
            petName,
            petType,
            petSize,
            checkInDate,
            checkOutDate,
            ownerName,
            roomId
        );

        // 保存订单
        this.dataManager.addOrder(order);

        // 关闭模态框
        this.closeOrderModal();

        // 重新渲染房间列表
        this.renderRoomList();

        // 显示成功消息
        alert('订单创建成功！');
    }

    renderRoomList() {
        const roomListContainer = document.getElementById('roomList');
        roomListContainer.innerHTML = '';

        this.dataManager.rooms.forEach(room => {
            const currentOccupancy = this.dataManager.getRoomCurrentOccupancy(room.id);
            const availableCapacity = this.dataManager.getRoomAvailableCapacity(room.id);
            const isAvailable = availableCapacity > 0;
            const isFull = availableCapacity === 0;

            const roomCard = document.createElement('div');
            roomCard.className = `room-card ${isFull ? 'room-full' : ''}`;
            roomCard.dataset.roomId = room.id;

            roomCard.innerHTML = `
                <div class="room-number">房间 ${room.number} - ${room.type}</div>
                <div class="room-status">
                    ${isFull ? '<span class="status-full">已满</span>' : '<span class="status-available">可用</span>'}
                </div>
                <div class="room-capacity">
                    <div class="capacity-info">
                        <span>总容量: ${room.capacity}</span>
                    </div>
                    <div class="capacity-info">
                        <span>当前入住: ${currentOccupancy}</span>
                    </div>
                    <div class="capacity-info">
                        <span class="${isAvailable ? 'available' : 'unavailable'}">
                            剩余: ${availableCapacity}
                        </span>
                    </div>
                </div>
            `;

            // 点击房间卡片查看详情
            roomCard.addEventListener('click', () => {
                this.showRoomDetails(room.id);
            });

            roomListContainer.appendChild(roomCard);
        });
    }

    showRoomDetails(roomId) {
        this.currentRoomId = roomId;
        const room = this.dataManager.getRoomById(roomId);
        const orders = this.dataManager.getOrdersByRoomId(roomId);
        const currentOccupancy = this.dataManager.getRoomCurrentOccupancy(roomId);
        const availableCapacity = this.dataManager.getRoomAvailableCapacity(roomId);

        // 设置标题
        document.getElementById('roomDetailsTitle').textContent = `房间 ${room.number} 详情`;

        // 设置房间信息
        const roomInfoDiv = document.getElementById('roomInfo');
        roomInfoDiv.innerHTML = `
            <p><strong>房间编号:</strong> ${room.number}</p>
            <p><strong>房间类型:</strong> ${room.type}</p>
            <p><strong>总容量:</strong> ${room.capacity}</p>
            <p><strong>当前入住:</strong> ${currentOccupancy}</p>
            <p><strong>剩余容量:</strong> ${availableCapacity}</p>
        `;

        // 渲染宠物列表
        const petListContainer = document.getElementById('petList');
        petListContainer.innerHTML = '';

        if (orders.length === 0) {
            petListContainer.innerHTML = '<p>暂无入住宠物</p>';
        } else {
            orders.forEach(order => {
                const petCard = document.createElement('div');
                const orderStatus = this.dataManager.getOrderStatus(order);
                
                // 根据状态添加不同的样式类
                let statusClass = '';
                if (orderStatus === '待入住') {
                    statusClass = 'status-pending';
                } else if (orderStatus === '入住中') {
                    statusClass = 'status-checked-in';
                } else if (orderStatus === '已过期') {
                    statusClass = 'status-expired';
                }
                
                petCard.className = `pet-card ${statusClass}`;

                petCard.innerHTML = `
                    <div class="pet-name">${order.petName}</div>
                    <div class="pet-info">
                        <p><strong>类型:</strong> ${order.petType}</p>
                        ${order.petSize ? `<p><strong>体型:</strong> ${order.petSize}</p>` : ''}
                        <p><strong>入住日期:</strong> ${order.checkInDate}</p>
                        <p><strong>离店日期:</strong> ${order.checkOutDate}</p>
                        <p><strong>主人姓名:</strong> ${order.ownerName}</p>
                        <p><strong>状态:</strong> <span class="order-status-${statusClass}">${orderStatus}</span></p>
                    </div>
                    <button class="checkout-btn" data-order-id="${order.id}">办理离店</button>
                `;

                // 离店按钮事件
                const checkoutBtn = petCard.querySelector('.checkout-btn');
                checkoutBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.checkoutPet(order.id);
                });

                petListContainer.appendChild(petCard);
            });
        }

        // 显示详情页面，隐藏列表页面
        document.querySelector('.room-list-section').classList.add('hidden');
        document.getElementById('roomDetailsSection').classList.remove('hidden');
    }

    showRoomList() {
        this.currentRoomId = null;
        document.querySelector('.room-list-section').classList.remove('hidden');
        document.getElementById('roomDetailsSection').classList.add('hidden');
        this.renderRoomList();
    }

    checkoutPet(orderId) {
        if (confirm('确定要办理离店吗？')) {
            this.dataManager.checkoutOrder(orderId);
            
            // 如果当前在房间详情页，重新渲染详情
            if (this.currentRoomId) {
                this.showRoomDetails(this.currentRoomId);
            }
            
            // 重新渲染列表
            this.renderRoomList();
            
            alert('离店办理成功！');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PetHotelApp();
});