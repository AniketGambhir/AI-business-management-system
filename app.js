let currentTable = "";
let currentColumns = [];
let currentPrimaryKey = "";
let editingValue = null;


// ======================================================
// CURSOR LIGHT
// ======================================================

const cursorLight = document.getElementById("cursor-light");

document.addEventListener("mousemove", function(event) {

    cursorLight.style.left = event.clientX + "px";
    cursorLight.style.top = event.clientY + "px";

});


// ======================================================
// LOAD TABLES
// ======================================================

async function loadTables() {

    const response = await fetch("/api/tables");

    const tables = await response.json();

    const container =
        document.getElementById("table-container");

    container.innerHTML = "";

    tables.forEach((table, index) => {

        const card = document.createElement("div");

        card.className = "table-card";

        card.onclick = function() {
            loadTable(table);
        };

        const displayName =
            table.charAt(0).toUpperCase()
            + table.slice(1);

        card.innerHTML = `
            <div class="table-number">
                0${index + 1}
            </div>

            <h3>${displayName}</h3>

            <p>Manage ${displayName} data</p>
        `;

        container.appendChild(card);

    });

    document.getElementById("record-count").innerText =
        tables.length + " Tables";

}


// ======================================================
// LOAD TABLE DATA
// ======================================================

async function loadTable(tableName) {

    currentTable = tableName;

    const response =
        await fetch(`/api/table/${tableName}`);

    const result = await response.json();

    if (result.error) {

        alert(result.error);

        return;
    }

    currentColumns = result.columns;

    findPrimaryKey();

    document.getElementById("data-section")
        .classList.remove("hidden");

    document.getElementById("table-title")
        .innerText =
        tableName.toUpperCase();

    createTableHeader();

    displayData(result.data);

    document.getElementById("data-section")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// ======================================================
// FIND PRIMARY KEY
// ======================================================

function findPrimaryKey() {

    const pk =
        currentColumns.find(
            column => column.Key === "PRI"
        );

    if (pk) {

        currentPrimaryKey = pk.Field;

    } else {

        currentPrimaryKey =
            currentColumns[0].Field;
    }
}


// ======================================================
// CREATE TABLE HEADER
// ======================================================

function createTableHeader() {

    const header =
        document.getElementById("table-head");

    header.innerHTML = "";

    currentColumns.forEach(column => {

        const th = document.createElement("th");

        th.innerText = column.Field;

        header.appendChild(th);

    });

    const actionHeader =
        document.createElement("th");

    actionHeader.innerText = "Actions";

    header.appendChild(actionHeader);
}


// ======================================================
// DISPLAY DATA
// ======================================================

function displayData(data) {

    const body =
        document.getElementById("table-body");

    body.innerHTML = "";

    if (data.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="${currentColumns.length + 1}">
                    No records found
                </td>
            </tr>
        `;

        return;
    }

    data.forEach(row => {

        const tr = document.createElement("tr");

        currentColumns.forEach(column => {

            const td = document.createElement("td");

            let value = row[column.Field];

            if (value === null) {
                value = "NULL";
            }

            td.innerText = value;

            tr.appendChild(td);

        });


        // Actions
        const actionTd =
            document.createElement("td");


        // Edit button
        const editButton =
            document.createElement("button");

        editButton.innerText = "Edit";

        editButton.className =
            "action-btn edit-btn";

        editButton.onclick = function() {

            openEditForm(row);

        };


        // Delete button
        const deleteButton =
            document.createElement("button");

        deleteButton.innerText = "Delete";

        deleteButton.className =
            "action-btn delete-btn";

        deleteButton.onclick = function() {

            deleteRecord(
                row[currentPrimaryKey]
            );

        };


        actionTd.appendChild(editButton);

        actionTd.appendChild(deleteButton);

        tr.appendChild(actionTd);

        body.appendChild(tr);

    });
}


// ======================================================
// INSERT FORM
// ======================================================

function openInsertForm() {

    editingValue = null;

    document.getElementById("modal-title")
        .innerText = "Add Record";

    createForm(false);

    document.getElementById("modal")
        .classList.remove("hidden");
}


// ======================================================
// UPDATE FORM
// ======================================================

function openEditForm(row) {

    editingValue =
        row[currentPrimaryKey];

    document.getElementById("modal-title")
        .innerText = "Update Record";

    createForm(true, row);

    document.getElementById("modal")
        .classList.remove("hidden");
}


// ======================================================
// CREATE FORM DYNAMICALLY
// ======================================================

function createForm(isEdit, row = {}) {

    const container =
        document.getElementById("form-fields");

    container.innerHTML = "";

    currentColumns.forEach(column => {

        const group =
            document.createElement("div");

        group.className = "form-group";

        const label =
            document.createElement("label");

        label.innerText = column.Field;

        const input =
            document.createElement("input");

        input.type = "text";

        input.name = column.Field;

        input.value =
            row[column.Field] ?? "";

        // Auto increment primary key
        if (
            column.Extra &&
            column.Extra.includes("auto_increment")
        ) {

            if (!isEdit) {
                input.disabled = true;
            }
        }

        group.appendChild(label);

        group.appendChild(input);

        container.appendChild(group);

    });
}


// ======================================================
// SAVE INSERT / UPDATE
// ======================================================

async function saveRecord(event) {

    event.preventDefault();

    const form =
        document.getElementById("record-form");

    const formData =
        new FormData(form);

    const data = {};

    formData.forEach((value, key) => {

        data[key] = value;

    });


    // UPDATE
    if (editingValue !== null) {

        const response =
            await fetch(
                `/api/table/${currentTable}/update`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        primary_key:
                            currentPrimaryKey,

                        primary_value:
                            editingValue,

                        changes: data

                    })
                }
            );

        const result =
            await response.json();

        if (result.error) {

            alert(result.error);

            return;
        }

        alert("Record updated successfully!");

    }


    // INSERT
    else {

        const response =
            await fetch(
                `/api/table/${currentTable}/insert`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(data)
                }
            );

        const result =
            await response.json();

        if (result.error) {

            alert(result.error);

            return;
        }

        alert("Record inserted successfully!");

    }

    closeModal();

    loadTable(currentTable);
}


// ======================================================
// DELETE
// ======================================================

async function deleteRecord(primaryValue) {

    const confirmation =
        confirm(
            "Are you sure you want to delete this record?"
        );

    if (!confirmation) {
        return;
    }

    const response =
        await fetch(
            `/api/table/${currentTable}/delete`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    primary_key:
                        currentPrimaryKey,

                    primary_value:
                        primaryValue

                })
            }
        );

    const result =
        await response.json();

    if (result.error) {

        alert(result.error);

        return;
    }

    alert("Record deleted successfully!");

    loadTable(currentTable);
}


// ======================================================
// SEARCH
// ======================================================

async function searchRecords() {

    const search =
        document.getElementById(
            "search-input"
        ).value;

    const response =
        await fetch(
            `/api/table/${currentTable}/search?q=${encodeURIComponent(search)}`
        );

    const data =
        await response.json();

    displayData(data);
}


// ======================================================
// CLOSE MODAL
// ======================================================

function closeModal() {

    document.getElementById("modal")
        .classList.add("hidden");

}


// ======================================================
// CLOSE TABLE
// ======================================================

function closeTable() {

    document.getElementById("data-section")
        .classList.add("hidden");

}


// ======================================================
// START
// ======================================================

loadTables();
