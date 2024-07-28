document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration
    var firebaseConfig = {
        apiKey: "AIzaSyBhyXPdA9Y3K-CKK0l-eeqQC_YolkQ3_jc",
        authDomain: "inventoryapp-a952a.firebaseapp.com",
        projectId: "inventoryapp-a952a",
        storageBucket: "inventoryapp-a952a.appspot.com",
        messagingSenderId: "233017121903",
        appId: "1:233017121903:web:3ec1d8f114f26843f3c19a",
        measurementId: "G-ZD17MYR9KE"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    const itemForm = document.getElementById('item-form');
    const inventoryList = document.getElementById('inventory-list');
    const logList = document.getElementById('log-list');
    const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
    const modalSizeControls = document.getElementById('modal-size-controls');
    const saveChangesButton = document.getElementById('save-changes');
    const cancelEditButton = document.getElementById('cancel-edit');

    const sizes = ['XS', 'S', 'M', 'L', 'XL'];
    let currentEditItem = null;
    let inventoryData = [];

    function ensureSizeFields(itemData) {
        sizes.forEach(size => {
            if (!itemData.sizes.hasOwnProperty(size)) {
                itemData.sizes[size] = 0;
            }
        });
    }

    function saveInventoryData(itemData) {
        db.collection("inventoryData").doc(itemData.name).set(itemData)
        .then(() => {
            console.log("Document successfully written!");
        })
        .catch((error) => {
            console.error("Error writing document: ", error);
        });
    }

    function loadInventoryData() {
        db.collection("inventoryData").get().then((querySnapshot) => {
            inventoryData = []; // Clear current inventory data
            querySnapshot.forEach((doc) => {
                let itemData = doc.data();
                ensureSizeFields(itemData); // Ensure all size fields are initialized
                inventoryData.push(itemData);
                addItemToInventory(itemData);
            });
        });
    }

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = document.getElementById('item-name').value;
        const itemImage = document.getElementById('item-image').files[0];
        if (itemName && itemImage) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const itemData = {
                    name: itemName,
                    image: event.target.result,
                    sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0 }
                };
                inventoryData.push(itemData);
                saveInventoryData(itemData); // Save to Firestore
                addItemToInventory(itemData);
                itemForm.reset();
            };
            reader.readAsDataURL(itemImage);
        }
    });

    function addItemToInventory(itemData) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('inventory-item', 'p-3', 'mb-3', 'bg-light', 'border', 'rounded', 'animate__animated', 'animate__fadeIn');
        itemDiv.innerHTML = `
            <h3>${itemData.name}</h3>
            <img src="${itemData.image}" alt="${itemData.name}" class="img-fluid mb-2">
            <div class="size-controls">
                ${sizes.map(size => `
                    <div>
                        <label>${size}:</label>
                        <button class="btn btn-primary size-btn" data-size="${size}" data-action="decrease">-</button>
                        <span>${itemData.sizes[size]}</span>
                        <button class="btn btn-primary size-btn" data-size="${size}" data-action="increase">+</button>
                    </div>
                `).join('')}
            </div>
            <div class="total-count mt-2">
                Total: ${Object.values(itemData.sizes).reduce((a, b) => a + b, 0)}
            </div>
            <button class="btn btn-success save-btn mt-2">Save</button>
        `;
        inventoryList.appendChild(itemDiv);

        itemDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('size-btn')) {
                const size = e.target.dataset.size;
                const action = e.target.dataset.action;
                if (action === 'increase') {
                    itemData.sizes[size]++;
                } else if (action === 'decrease' && itemData.sizes[size] > 0) {
                    itemData.sizes[size]--;
                }
                e.target.parentElement.querySelector('span').textContent = itemData.sizes[size];
                e.target.closest('.inventory-item').querySelector('.total-count').textContent = `Total: ${Object.values(itemData.sizes).reduce((a, b) => a + b, 0)}`;
            } else if (e.target.classList.contains('save-btn')) {
                saveInventoryData(itemData); // Save changes to Firestore
                moveItemToLog(itemData, itemDiv);
            }
        });
    }

    function moveItemToLog(itemData, itemDiv) {
        const logItem = document.createElement('div');
        logItem.classList.add('log-item', 'p-3', 'mb-3', 'bg-light', 'border', 'rounded', 'animate__animated', 'animate__fadeIn');
        logItem.innerHTML = `
            <h3>${itemData.name}</h3>
            <img src="${itemData.image}" alt="${itemData.name}" class="img-fluid mb-2">
            <div class="size-controls">
                ${sizes.map(size => `
                    <div>
                        <label>${size}:</label>
                        <span>${itemData.sizes[size]}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-warning edit-btn mt-2">Edit</button>
            <button class="btn btn-danger delete-btn mt-2">Delete</button>
        `;
        logList.appendChild(logItem);
        inventoryList.removeChild(itemDiv);

        logItem.querySelector('.edit-btn').addEventListener('click', () => {
            currentEditItem = itemData;
            showEditModal(itemData);
        });

        logItem.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this item?')) {
                db.collection("inventoryData").doc(itemData.name).delete().then(() => {
                    console.log("Document successfully deleted!");
                    inventoryData = inventoryData.filter(item => item.name !== itemData.name);
                    logList.removeChild(logItem);
                }).catch((error) => {
                    console.error("Error removing document: ", error);
                });
            }
        });
    }

    function showEditModal(itemData) {
        modalSizeControls.innerHTML = sizes.map(size => `
            <div>
                <label>${size}:</label>
                <button class="btn btn-primary size-btn" data-size="${size}" data-action="decrease">-</button>
                <span>${itemData.sizes[size]}</span>
                <button class="btn btn-primary size-btn" data-size="${size}" data-action="increase">+</button>
            </div>
        `).join('');

        Array.from(modalSizeControls.getElementsByClassName('size-btn')).forEach(button => {
            button.addEventListener('click', (e) => {
                const size = e.target.dataset.size;
                const action = e.target.dataset.action;
                if (action === 'increase') {
                    itemData.sizes[size]++;
                } else if (action === 'decrease' && itemData.sizes[size] > 0) {
                    itemData.sizes[size]--;
                }
                e.target.parentElement.querySelector('span').textContent = itemData.sizes[size];
            });
        });

        editModal.show();
    }

    saveChangesButton.addEventListener('click', () => {
        if (currentEditItem) {
            const logItems = Array.from(logList.children);
            logItems.forEach(logItem => {
                if (logItem.querySelector('h3').textContent === currentEditItem.name) {
                    logItem.querySelector('.size-controls').innerHTML = sizes.map(size => `
                        <div>
                            <label>${size}:</label>
                            <span>${currentEditItem.sizes[size]}</span>
                        </div>
                    `).join('');
                }
            });
            saveInventoryData(currentEditItem); // Save updated data to Firestore
        }
        editModal.hide();
        currentEditItem = null;
    });

    cancelEditButton.addEventListener('click', () => {
        editModal.hide();
        currentEditItem = null;
    });

    loadInventoryData(); // Load initial inventory data from Firestore
});



















