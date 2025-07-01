
const finalPrepProgressCN = 'finalPrepProgress';
const inventoryCN = 'inventory';
const highPriorityFinishedCN = 'hPF';
const highPriorityUnfinishedCN = 'hPU';
const lowPrioritySelectedCN = 'lPS';
const extraPrepListCN = 'ePL';
class PrepItem {
    constructor(itemName, batchUnitName, batchTimeMinutes, prepThisWeek, prepTomorrow, finishedItemBool, ingredients) {
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.batchTimeMinutes = batchTimeMinutes;
        this.prepThisWeek = prepThisWeek;
        this.prepTomorrow = prepTomorrow;
        this.finishedItemBool = finishedItemBool;
        this.totalBatchTime = roundToNearestTenth(this.batchTimeMinutes * this.prepThisWeek);
        this.ingredients = ingredients;
    }
}
class Item {
    constructor(itemName, batchUnitName, finishedItemBool, batchesPerSaleDollar, batchSize, batchTimeMinutes, ingredients) {
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.finishedItemBool = finishedItemBool;
        this.batchesPerSaleDollar = batchesPerSaleDollar;
        this.batchSize = batchSize;
        this.batchTimeMinutes = batchTimeMinutes;
        this.ingredients = ingredients;
    }
}
function roundToNearestTenth(number) {
    return Math.round(number * 10) / 10;
}
function getCookie(name) {
    var _a;
    const cookieInfo = (_a = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))) === null || _a === void 0 ? void 0 : _a.split("=")[1];
    return cookieInfo;
}
function parseCookie(cookie, cookieName) {
    if (cookie) {
        return JSON.parse(cookie);
    }
    else {
        console.log(`oh no, we didn't find that cookie! For cookie name ${cookieName}`);
    }
}
function midnight() {
    const now = new Date();
    now.setHours(23, 59, 59, 0);
    const midnight = now.toUTCString();
    return midnight;
}
function setInventoryCookie(newInventory, name) {
    document.cookie = `${name}=;expires=Fri, 12 Jan 2018`;
    document.cookie = `${name}=${JSON.stringify(newInventory)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}
function setUserInfoCookie(form) {
    document.cookie = "userName=;expires=Fri, 12 Jan 2018";
    document.cookie = "location=;expires=Fri, 12 Jan 2018";
    document.cookie = `userName=${form.nameInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
    document.cookie = `location=${form.locationInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
}
function setPrepListCookie(prepList, name) {
    document.cookie = `${name}=;expires=Fri, 12 Jan 2018`;
    document.cookie = `${name}=${JSON.stringify(prepList)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}
function getLocations() {
    const jsonStrLocations = '[ "Norcross", "Settlers Green", "The Commissary", "Portland", "Portsmouth", "Hub Hall", "Big Cheddah", "Monterey Jack", "Pepper Jack" ]';
    return JSON.parse(jsonStrLocations);
}
function userInfo(locations, id) {
    let completeHTML = '';
    let locationOptions = '';
    const nameLabel = `<label for="nameInput">First Name</label><br>`;
    const nameInput = '<input type="string" name="nameInput" id="nameInput"><br>';
    const locationLabel = '<label for=locationInput">Location</label><br>';
    locations.forEach((location) => {
        const newOption = `<option value="${location}">${location}</option>`;
        locationOptions += newOption;
    });
    const locationInput = `<select name="location" id="locationInput">${locationOptions}</select><br>`;
    completeHTML = `<h1>Input User Info.</h1><form id="userInfoForm">${nameLabel}${nameInput}${locationLabel}${locationInput}<input type="submit" value="Submit" class="center"></form>`;
    const body = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }
}
async function inventoryForm(id) {
    let completeHTML = "";
    let items = getItems();
    console.log("Item Array:");
    console.log(items);
    items.forEach((Item) => {
        const label = `<label for="${Item.itemName}Input">${Item.batchUnitName}s of ${Item.itemName}</label><br>`;
        const input = `<input type="number" step="any" name="${Item.itemName}Input"><br>`;
        completeHTML += label + input;
    });
    completeHTML = `<h1>Input Inventory</h1><form id="inventoryForm">${completeHTML}<input type="submit" value="Submit" class="center"></form>`;
    const body = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("inventoryForm did not find an HTML element where one was expected");
    }
}
function makeHTMLPrepRows(prepList, name, cookieName, completeHTML = '') {
    const progress = parseCookie(getCookie(cookieName), cookieName);
    prepList.forEach((PrepItem) => {
        const row = `<tr><td>${PrepItem.itemName}</td><td>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td>${PrepItem.totalBatchTime} min</td><td><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></td></tr>`;
        completeHTML += row;
    });
    return completeHTML;
}
function makeHTMLPrepRowsStrong(prepList, name, cookieName, completeHTML = '') {
    if (getCookie(cookieName) !== undefined) {
        console.log('the cookie exists!');
        const progress = parseCookie(getCookie(cookieName), cookieName);
        prepList.forEach((PrepItem) => {
            let row = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></strong></td></tr>`;
            completeHTML += row;
        });
    }
    else {
        console.log('the cookie doesnt exist!');
        prepList.forEach((PrepItem) => {
            let row = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="0"></strong></td></tr>`;
            completeHTML += row;
        });
    }
    return completeHTML;
}
function makeFinalPrepList(completeHTML) {
    completeHTML = `<h1>Final Prep List</h1>
                    <p>Items needed for tomorrow are in <strong>bold</strong>.</p>
                        <table id="finalPrepList" class="center">
                            <tr>
                                <th>Item</th>
                                <th>What's needed</th>
                                <th>Max time</th>
                                <th>Amount made</th>
                            </tr>
                            ${completeHTML}
                        </table>
                        <button type="button" id="submitButton" class="center">Finished!</button>
                        <p>(click for extra prep)</p>`;
    const body = document.getElementById('body');
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("finalPrepList did not find an HTML element where one was expected");
    }
}
function displayExtraEnd(extraPrepList) {
    const finalPrepProgressStr = getCookie('finalPrepProgress');
    const finalPrepProgress = JSON.parse(finalPrepProgressStr !== undefined ? finalPrepProgressStr : 'error');
    const location = getCookie('location');
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds() > 9 ? '' : '0'}${now.getSeconds()}`;
    const user = getCookie('userName');
    let dbRef = firebase.database().ref(`/Prep Record/${location}/${todayStr}`);
    dbRef.set(finalPrepProgress);
    dbRef.update({ 'user': user });
    dbRef.update({ 'time': timeStr });
    if (extraPrepList[0]) {
        let completeHTML = "";
        extraPrepList.forEach((PrepItem) => {
            let row = `<tr><td>${PrepItem.itemName}</td><td>${PrepItem.prepThisWeek}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</td><td>${PrepItem.totalBatchTime} min</td><td><input class="extraPrepListInput" type="number" id="extraPrepList${PrepItem.itemName}"></td></tr>`;
            completeHTML += row;
        });
        completeHTML = `<h1>Extra Prep List</h1>
                        <table id="extraPrepList" class="center">
                            <tr>
                            <th>Item</th>
                            <th>Prep Amount</th>
                            <th>Prep Time</th>
                            <th>Prepped?</th>
                            </tr>
                            ${completeHTML}
                        </table>
                        <button type="button" id="submitButtonExtra" class="center">Finished!</button>
                        <p>(for real, this is all the prep)</p>`;
        const body = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }
        else {
            console.log("displayExtraEnd did not find an HTML element where one was expected");
        }
        const submitButton = document.getElementById('submitButtonExtra');
        submitButton === null || submitButton === void 0 ? void 0 : submitButton.addEventListener('click', () => {
            const inputs = document.getElementsByClassName('extraPrepListInput');
            var isUnfilled = false;
            for (let x = 0; x < inputs.length; x++) {
                if (inputs[x].type == 'number' && !inputs[x].value) {
                    isUnfilled = true;
                }
            }
            if (isUnfilled) {
                alert('You have not completed this prep list! Prep all the items to finish prep.');
            }
            else {
                nothingToPrep();
            }
        });
    }
    else if (!extraPrepList[0]) {
        nothingToPrep();
    }
}
function formDataToRecord(formData) {
    const record = {};
    formData.forEach((value, key) => {
        record[String(key).split("Input")[0]] = Number(value);
    });
    return record;
}
function calcNeededTomorrow(item, tomorrowSales, currentInventory) {
    let neededTomorrow = roundToNearestTenth((tomorrowSales * item.batchesPerSaleDollar * 1.25) - currentInventory[item.itemName]);
    return neededTomorrow;
}
function calcNeededThisWeek(item, thisWeekSales, tomorrowSales, currentInventory) {
    let neededThisWeek = Math.floor((thisWeekSales * item.batchesPerSaleDollar * 0.85) - currentInventory[item.itemName]);
    if (neededThisWeek <= 0 && calcNeededTomorrow(item, tomorrowSales, currentInventory) > 0) {
        neededThisWeek = 1;
    }
    return neededThisWeek;
}
function checkPriorityLevel(item, thisWeekSales, tomorrowSales, currentInventory) {
    const neededTomorrow = calcNeededTomorrow(item, tomorrowSales, currentInventory);
    const neededThisWeek = calcNeededThisWeek(item, thisWeekSales, tomorrowSales, currentInventory);
    if (neededTomorrow < 0 || neededTomorrow === 0) {
        if (neededThisWeek > 0) {
            return 1;
        }
        else {
            return 0;
        }
    }
    else if (neededTomorrow > 0) {
        return 2;
    }
    else {
        console.log("oh nooooooo -with love, checkPriorityLevel");
        return 0;
    }
}
function nothingToPrep() {
    let completeHTML = '<h2>There is nothing to prep!</h2>';
    const body = document.getElementById('body');
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("nothingToPrep did not find an HTML element where one was expected");
    }
}
function sortPrepListByUi(highPriorityUnfinished, highPriorityFinished, prepList, lowPrioritySelected, extraPrep, remainingPrepTime, id) {
    let completeHTML = "";
    prepList.forEach((PrepItem) => {
        let row = `<tr><td>${PrepItem.itemName}</td><td><input class="lowPriorityUiCheckbox" type="checkbox" id="lowPrioritySelectionTable${PrepItem.itemName}"></td><td>${PrepItem.totalBatchTime} min</td></tr>`;
        completeHTML += row;
    });
    completeHTML = `<h1>Select Additional Items to Prep</h1>
                    <h2 id="remainingPrepTime">Remaining Prep Time: ${remainingPrepTime} minutes</h2>
                    <table id="lowPrioritySelectionTable" class="center">
                        <tr>
                            <th>Item</th>
                            <th>Prep now?</th>
                            <th>Prep Time</th>
                        </tr>
                        ${completeHTML}
                    </table>
                    <button type="button" id="submitButton" class="center">Submit</button>`;
    const body = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("sortPrepListByUi did not find an HTML element where one was expected");
    }
    let displayPrepTime = remainingPrepTime;
    prepList.forEach((PrepItem) => {
        const checkbox = document.getElementById(`lowPrioritySelectionTable${PrepItem.itemName}`);
        checkbox.addEventListener('change', () => {
            const header = document.getElementById('remainingPrepTime');
            if (header) {
                if (checkbox.checked) {
                    displayPrepTime -= Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }
                else if (!checkbox.checked) {
                    displayPrepTime += Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }
            }
            else {
                console.log('sortPrepListByUi did not identify the low priority selection table properly');
            }
        });
    });
    const submitButton = document.getElementById('submitButton');
    submitButton === null || submitButton === void 0 ? void 0 : submitButton.addEventListener('click', () => {
        if (displayPrepTime <= 0) {
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox');
            for (let x = 0; x < checkboxes.length; x++) {
                if (checkboxes[x].type == 'checkbox') {
                    if (checkboxes[x].checked) {
                        lowPrioritySelected.push(prepList[x]);
                    }
                    else if (!checkboxes[x].checked) {
                        extraPrep.push(prepList[x]);
                    }
                }
            }
            displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
        }
        else if (displayPrepTime > 0) {
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox');
            var isUnchecked = false;
            for (let x = 0; x < checkboxes.length; x++) {
                if (checkboxes[x].type == 'checkbox') {
                    isUnchecked = !checkboxes[x].checked;
                    if (isUnchecked)
                        break;
                }
            }
            if (!isUnchecked) {
                for (let x = 0; x < checkboxes.length; x++) {
                    if (checkboxes[x].type == 'checkbox') {
                        if (checkboxes[x].checked) {
                            lowPrioritySelected.push(prepList[x]);
                        }
                        else if (!checkboxes[x].checked) {
                            extraPrep.push(prepList[x]);
                        }
                    }
                }
                displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
            }
            else if (isUnchecked) {
                alert('You have more prep time remaining, please select more items to prep!');
            }
        }
    });
}
function sortPrepListByFinished(prepList) {
    const unfinished = [];
    const finished = [];
    prepList.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool === true) {
            finished.push(PrepItem);
        }
        else {
            unfinished.push(PrepItem);
        }
    });
    return [unfinished, finished];
}
function makePrepList() {
    let highPriorityPrepTime = 0;
    let highPriority = [];
    let lowPriority = [];
    let dontPrep = [];
    let highPriorityUnfinished = [];
    let highPriorityFinished = [];
    let lowPrioritySelected = [];
    let extraPrep = [];
    let arrayOfItems = getItems();
    let prepHours = getPrepHours();
    let prepMinutes = prepHours * 60;
    let thisWeekSales = getThisWeekSales();
    let tomorrowSales = getTomorrowSales();
    const inventoryCookie = getCookie(inventoryCN);
    const currentInventory = parseCookie(inventoryCookie, inventoryCN);
    const location = getCookie('location');
    const user = getCookie('userName');
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    const dbRef = firebase.database().ref(`/Inventory Record/${location}/${todayStr}/${timeStr}`);
    dbRef.set(currentInventory);
    dbRef.update({ 'user': user });
    arrayOfItems.forEach((Item) => {
        const newPrepItem = new PrepItem(Item.itemName, Item.batchUnitName, Item.batchTimeMinutes, calcNeededThisWeek(Item, thisWeekSales, tomorrowSales, currentInventory), calcNeededTomorrow(Item, tomorrowSales, currentInventory), Item.finishedItemBool, Item.ingredients);
        switch (checkPriorityLevel(Item, thisWeekSales, tomorrowSales, currentInventory)) {
            case 2:
                highPriority.push(newPrepItem);
                break;
            case 1:
                lowPriority.push(newPrepItem);
                break;
            case 0:
                dontPrep.push(newPrepItem);
                break;
            default:
                dontPrep.push(newPrepItem);
                break;
        }
    });
    dontPrep.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined) {
            if (PrepItem.ingredients !== undefined) {
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1) {
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        dontPrep.push(ingredientItem);
                    }
                    else {
                        let ingredientIndexLp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                        if (ingredientIndexLp > -1) {
                            let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                            dontPrep.push(ingredientItem);
                        }
                        else { }
                    }
                });
            }
        }
        else { }
    });
    lowPriority.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined) {
            if (PrepItem.ingredients !== undefined) {
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1) {
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        lowPriority.push(ingredientItem);
                    }
                    else { }
                });
            }
            else { }
        }
        else { }
    });
    highPriority.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined) {
            if (PrepItem.ingredients !== undefined) {
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1) {
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        console.log(`Adding ingredient to high priority list: ${ingredient}`);
                        highPriority.push(ingredientItem);
                    }
                    else {
                        let ingredientIndexLp = dontPrep.findIndex(obj => obj.itemName === ingredient);
                        if (ingredientIndexLp > -1) {
                            let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                            highPriority.push(ingredientItem);
                        }
                        else { }
                    }
                });
            }
            else { }
        }
        else { }
    });
    highPriority.forEach((PrepItem) => {
        if (PrepItem !== undefined) {
            highPriorityPrepTime += PrepItem.totalBatchTime;
        }
    });
    let remainingPrepTime = prepMinutes - highPriorityPrepTime;
    highPriority.sort((a, b) => b.totalBatchTime - a.totalBatchTime);
    [highPriorityUnfinished, highPriorityFinished] = sortPrepListByFinished(highPriority);
    if (remainingPrepTime > 0 && lowPriority[0]) {
        sortPrepListByUi(highPriorityUnfinished, highPriorityFinished, lowPriority, lowPrioritySelected, extraPrep, remainingPrepTime, "body");
    }
    else if (highPriorityFinished[0] || highPriorityUnfinished[0]) {
        displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, lowPriority);
    }
    else {
        nothingToPrep();
    }
}
function displayPrepLists(highPriorityFinished = [], highPriorityUnfinished, lowPrioritySelected, extraPrepList) {
    let completeHTML = "";
    let finalPrepList = [];
    setPrepListCookie(highPriorityFinished, highPriorityFinishedCN);
    setPrepListCookie(highPriorityUnfinished, highPriorityUnfinishedCN);
    setPrepListCookie(lowPrioritySelected, lowPrioritySelectedCN);
    setPrepListCookie(extraPrepList, extraPrepListCN);
    completeHTML += makeHTMLPrepRowsStrong(highPriorityUnfinished, 'final', finalPrepProgressCN);
    completeHTML += makeHTMLPrepRowsStrong(highPriorityFinished, 'final', finalPrepProgressCN);
    const separator = `<tr class= "separator"><td></td><td></td><td></td><td></td></tr>`;
    completeHTML += separator;
    completeHTML += makeHTMLPrepRows(lowPrioritySelected, 'final', finalPrepProgressCN);
    makeFinalPrepList(completeHTML);
    highPriorityFinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    });
    highPriorityUnfinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    });
    lowPrioritySelected.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    });
    const finalPrepProgress = {};
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`);
        finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
        setInventoryCookie(finalPrepProgress, finalPrepProgressCN);
    });
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`);
        input.addEventListener('input', () => {
            finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
            setInventoryCookie(finalPrepProgress, finalPrepProgressCN);
        });
    });
    const submitButton = document.getElementById('submitButton');
    submitButton === null || submitButton === void 0 ? void 0 : submitButton.addEventListener('click', () => {
        const inputs = document.getElementsByClassName('finalPrepListInput');
        var isUnfilled = false;
        for (let x = 0; x < inputs.length; x++) {
            if (inputs[x].type == 'number' && !inputs[x].value) {
                isUnfilled = true;
            }
        }
        if (!isUnfilled) {
            let belowMin = false;
            let aboveMax = false;
            for (let x = 0; x < finalPrepList.length; x++) {
                if (finalPrepProgress[finalPrepList[x].itemName] < finalPrepList[x].prepTomorrow) {
                    belowMin = true;
                }
                console.log(finalPrepProgress[finalPrepList[x].itemName]);
                console.log(finalPrepList[x].prepTomorrow);
                console.log(finalPrepList[x].itemName);
                console.log(belowMin);
            }
            for (let x = 0; x < finalPrepList.length; x++) {
                if (finalPrepProgress[finalPrepList[x].itemName] > finalPrepList[x].prepThisWeek) {
                    aboveMax = true;
                }
            }
            if (!aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow. Are you sure you're done with this prep list?`)) {
                displayExtraEnd(extraPrepList);
            }
            else if (aboveMax && !belowMin && confirm(`At least one of your entries is above the amount needed for next week. Are you sure you entered the amount correctly?`)) {
                displayExtraEnd(extraPrepList);
            }
            else if (aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow AND at least one of your entries is above the amount needed for next week. Are you sure you entered all the amounts correctly and you're done with this prep list?`)) {
                displayExtraEnd(extraPrepList);
            }
            else if (!aboveMax && !belowMin) {
                displayExtraEnd(extraPrepList);
            }
        }
        else if (isUnfilled) {
            alert('You have not completed this prep list! Prep all the items to access the extra prep list.');
        }
    });
}
async function getItemJson(location = 'Norcross') {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Item Lists').child(location).get().then((snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        }
        else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getItemJson: ${error}`);
    });
    console.log('JSON Items String:');
    console.log(jsonStrItems);
    return jsonStrItems;
}
async function getSalesHoursJson(location = 'Norcross') {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Sales and Hours').child(location).get().then((snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        }
        else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getSalesHoursJson: ${error}`);
    });
    return jsonStrItems;
}
async function getAllSalesHoursJson() {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Sales and Hours').get().then((snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        }
        else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getSalesHoursJson: ${error}`);
    });
    return jsonStrItems;
}
async function collectInfo() {
    const form = document.getElementById('userInfoForm');
    let body = document.getElementById('body');
    if (form) {
        await form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (form.nameInput.value) {
                if (body !== null) {
                    body.innerHTML = `<p id="loading">Loading</p><div class="loader"></div>`;
                }
                setUserInfoCookie(form);
                const hPF = getCookie(highPriorityFinishedCN);
                const hPU = getCookie(highPriorityUnfinishedCN);
                const lPS = getCookie(lowPrioritySelectedCN);
                const ePL = getCookie(extraPrepListCN);
                const highPriorityFinished = parseCookie(hPF, highPriorityFinishedCN);
                const highPriorityUnfinished = parseCookie(hPU, highPriorityUnfinishedCN);
                const lowPrioritySelected = parseCookie(lPS, lowPrioritySelectedCN);
                const extraPrepList = parseCookie(ePL, extraPrepListCN);
                const inventoryCookie = getCookie(inventoryCN);
                let dataString = await getFirebaseData(getCookie('location'));
                setSpreadsheetDataCookies(dataString);
                if (highPriorityFinished && confirm("A saved prep list was found. Do you want to use that preplist?")) {
                    displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, extraPrepList);
                }
                else if (inventoryCookie && confirm("A previously submitted inventory was found. Do you want to use that inventory?")) {
                    setInventoryCookie({}, finalPrepProgressCN);
                    makePrepList();
                }
                else {
                    setInventoryCookie({}, finalPrepProgressCN);
                    inventoryForm('body');
                    collectInventory();
                }
            }
            else if (!form.nameInput.value) {
                alert('Please input your name');
            }
            else {
                console.log('oh nooo From: collectInfo');
            }
        });
    }
    else {
        console.log('collectInfo did not find a form');
    }
}
function collectInventory() {
    const form = document.getElementById('inventoryForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const inventory = formDataToRecord(formData);
            let negativeEntry = false;
            let seemsHigh = false;
            Object.entries(inventory).forEach((x) => {
                if (x[1] < 0) {
                    negativeEntry = true;
                }
            });
            Object.entries(inventory).forEach((x) => {
                if (x[1] > 99) {
                    seemsHigh = true;
                }
            });
            if (negativeEntry) {
                alert('You cannot submit a negative value for inventory');
            }
            else if (!negativeEntry && seemsHigh) {
                if (confirm('At least one of your entries seems a little high. Are you sure this inventory is correct?')) {
                    setInventoryCookie(inventory, inventoryCN);
                    makePrepList();
                }
                else { }
            }
            else if (!negativeEntry) {
                setInventoryCookie(inventory, inventoryCN);
                makePrepList();
            }
        });
    }
}
function getItems(locationStr = '') {
    let itemArrStr = getCookie('itemArr');
    if (false) {
        console.log(locationStr);
        console.log(itemArrStr);
    }
    ;
    let localStorageItemArr = localStorage.getItem('itemArr');
    if (localStorageItemArr === null) {
        console.log(`Error in getItems`);
        return JSON.parse("\"error\"");
    }
    else {
        return JSON.parse(localStorageItemArr);
    }
}
function getPrepHours(locationStr = '') {
    let prepHoursStr = getCookie('todayPrepHours');
    if (false) {
        console.log(locationStr);
        console.log(prepHoursStr);
    }
    ;
    let localStoragePrepHours = localStorage.getItem('todayPrepHours');
    if (localStoragePrepHours === null) {
        console.log(`Error in getPrepHours`);
        return JSON.parse("\"error\"");
    }
    else {
        return JSON.parse(localStoragePrepHours);
    }
}
function getTomorrowSales(locationStr = '') {
    let tomorrowSalesStr = getCookie('tomorrowSales');
    if (false) {
        console.log(locationStr);
        console.log(tomorrowSalesStr);
    }
    ;
    let localStorageTomorrowSales = localStorage.getItem('tomorrowSales');
    if (localStorageTomorrowSales === null) {
        console.log(`Error in getTomorrowSales`);
        return JSON.parse("\"error\"");
    }
    else {
        return JSON.parse(localStorageTomorrowSales);
    }
}
function getThisWeekSales(locationStr = '') {
    let thisWeekSalesStr = getCookie('tomorrowSales');
    if (false) {
        console.log(locationStr);
        console.log(thisWeekSalesStr);
    }
    ;
    let localStorageThisWeekSales = localStorage.getItem('thisWeekSales');
    if (localStorageThisWeekSales === null) {
        console.log(`Error in getThisWeekSales`);
        return JSON.parse("\"error\"");
    }
    else {
        return JSON.parse(localStorageThisWeekSales);
    }
}
function setSpreadsheetDataCookies(data) {
    document.cookie = `salesHoursArr=;expires=Fri, 12 Jan 2018`;
    document.cookie = `salesHoursArr=${data[0]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    document.cookie = `itemArr=;expires=Fri, 12 Jan 2018`;
    document.cookie = `itemArr=${data[1]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('itemArr', data[1]);
    document.cookie = `todayPrepHours=;expires=Fri, 12 Jan 2018`;
    document.cookie = `todayPrepHours=${data[2]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('todayPrepHours', data[2]);
    document.cookie = `tomorrowSales=;expires=Fri, 12 Jan 2018`;
    document.cookie = `tomorrowSales=${data[3]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('tomorrowSales', data[3]);
    document.cookie = `thisWeekSales=;expires=Fri, 12 Jan 2018`;
    document.cookie = `thisWeekSales=${data[4]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('thisWeekSales', data[4]);
    if (false) {
        onLoad();
        onLoadGmPage();
    }
}
function onLoad() {
    const locations = getLocations();
    userInfo(locations, 'body');
    collectInfo();
}
async function onLoadGmPage() {
    const locations = getLocations();
    const salesHours = await getAllSalesHoursJson();
    createSalesHoursTable(locations, salesHours, 'id string...');
}
function createSalesHoursTable(locations, salesHours, id) {
    console.log(salesHours);
    let completeHTML = '';
    let locationOptions = '';
    const nameLabel = `<label for="nameInput">First Name</label><br>`;
    const nameInput = '<input type="string" name="nameInput" id="nameInput"><br>';
    const locationLabel = '<label for=locationInput">Location</label><br>';
    locations.forEach((location) => {
        const newOption = `<option value="${location}">${location}</option>`;
        locationOptions += newOption;
    });
    const locationInput = `<select name="location" id="locationInput">${locationOptions}</select><br>`;
    completeHTML = `<h1>Input User Info.</h1><form id="userInfoForm">${nameLabel}${nameInput}${locationLabel}${locationInput}<input type="submit" value="Submit" class="center"></form>`;
    const body = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }
}
async function getFirebaseData(locationStr = '') {
    const salesArr = JSON.parse(await getSalesHoursJson());
    let thisWeekSalesArr = [];
    let todayPrepHours;
    let tomorrowSales;
    let thisWeekSales = 0;
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
    let row = 0;
    if (salesArr === undefined) {
        console.log(`In getPrepHours; salesArr is undefined`);
        todayPrepHours = 8;
    }
    else {
        while (String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        console.log(`Todays date of ${todayStr} found at row ${row} with value ${salesArr[row]['Prep Hours']} hours`);
        if (locationStr) {
            todayPrepHours = Number(salesArr[row]['Prep Hours']);
        }
        else {
            console.log('Error in getSpreadsheetData with prep hours; default to 8');
            todayPrepHours = 8;
        }
    }
    row = 0;
    if (salesArr === undefined) {
        console.log(`In getTomorrowSales; salesArr is undefined`);
        tomorrowSales = 0;
    }
    else {
        while (String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        console.log(`Todays date of ${todayStr} found at row ${row} with value ${salesArr[row]['Historical Sales']} dollars`);
        if (locationStr) {
            tomorrowSales = Number(salesArr[row]['Historical Sales']) + Number(salesArr[row + 1]['Historical Sales']);
            console.log(`Today and tomorrow sales calculated to be ${tomorrowSales}`);
        }
        else {
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 5000');
            tomorrowSales = 5000;
        }
    }
    row = 0;
    if (salesArr === undefined) {
        console.log(`In getThisWeekSales; salesArr is undefined`);
        thisWeekSales = 0;
    }
    else {
        while (String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        for (let i = 1; i <= 7; i++) {
            thisWeekSales += Number(salesArr[row + i]['Historical Sales']);
            thisWeekSalesArr[i - 1] = salesArr[row + i];
        }
        console.log(`This week's sales calculated to be ${thisWeekSales}`);
        if (!locationStr) {
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 7000');
            thisWeekSales = 7000;
        }
    }
    return [JSON.stringify(thisWeekSalesArr), await getItemJson(), JSON.stringify(todayPrepHours), JSON.stringify(tomorrowSales), JSON.stringify(thisWeekSales),];
}
//# sourceMappingURL=app.js.map