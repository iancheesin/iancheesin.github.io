// import Sheet from 'google-apps-script'
 import firebase from "firebase/compat/app";
// import 'firebase/compat/auth';
// import "firebase/compat/database";
// import 'firebase/compat/firestore';

//TODO 6/3: make extra prep list save (copy functionality from final prep list)

//global cookie name variables
const finalPrepProgressCN = 'finalPrepProgress';
const inventoryCN = 'inventory';
const highPriorityFinishedCN = 'hPF';
const highPriorityUnfinishedCN = 'hPU';
const lowPrioritySelectedCN = 'lPS';
const extraPrepListCN = 'ePL';

type SalesHoursObj = {
    'Date': string;
    'Historical Sales': number;
    'Prep Hours': number;
}

// type AllSalesHoursObj = {
//     [key: string]: SalesHoursObj[];
// }

class PrepItem {
    itemName: string;
    batchUnitName: string;
    batchTimeMinutes: number;
    prepThisWeek: number;
    prepTomorrow: number;
    finishedItemBool: boolean; //true if this is a finished product
    totalBatchTime: number;
    ingredients: string[];

    constructor (itemName: string, batchUnitName: string, batchTimeMinutes: number, prepThisWeek: number, prepTomorrow: number, finishedItemBool: boolean, ingredients: string[] = []){
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.batchTimeMinutes = batchTimeMinutes;
        if(prepThisWeek <= 0) {
            this.prepThisWeek = 0;
        } else {
            this.prepThisWeek = prepThisWeek;
        }
        if(prepTomorrow <= 0) {
            this.prepTomorrow = 0;
        } else {
            this.prepTomorrow = prepTomorrow;
        }
        this.finishedItemBool = finishedItemBool;
        this.totalBatchTime = roundToNearestTenth(this.batchTimeMinutes * this.prepThisWeek);
        this.ingredients = ingredients;
    }
}

class Item {
    itemName: string;
    batchUnitName: string;
    finishedItemBool: boolean; //true if this is a finished product
    batchesPerSaleDollar: number;
    batchSize: number;
    batchTimeMinutes: number;
    ingredients: string[];
    
    constructor(itemName: string, batchUnitName: string, finishedItemBool: boolean, batchesPerSaleDollar: number, batchSize: number, batchTimeMinutes: number, ingredients: string[]) {
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.finishedItemBool = finishedItemBool; 
        this.batchesPerSaleDollar = batchesPerSaleDollar;
        this.batchSize = batchSize;
        this.batchTimeMinutes = batchTimeMinutes;
        this.ingredients = ingredients;
    }
}

//rounds a number to the nearest tenth
function roundToNearestTenth(number: number) {
  return Math.round(number * 10) / 10;
}

//gets a specific cookie value given a specific cookie name
function getCookie(name:string){
    const cookieInfo = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
    return cookieInfo;
}

//parses a cookie or logs a message if that cookie is undefined
function parseCookie(cookie: string | undefined, cookieName: string){
    if (cookie){
        return JSON.parse(cookie);
    }else{
        console.log(`oh no, we didn't find that cookie! For cookie name ${cookieName}`);
    }
}

//returns midnight for today's date
function midnight(){
    const now = new Date();
    now.setHours(23, 59, 59, 0);
    const midnight = now.toUTCString();
    return midnight;
}

//setXCookie Functions:
    //each function deletes the old cookie or cookies and saves a new cookie or cookies
    //expire at midnight unless otherwise specified


//newInventory is the inventory to be saved
//name is the name that the cookie will be saved under
function setInventoryCookie(newInventory: Record<string, number>, name:string){
    //delete old cookie
    document.cookie=`${name}=;expires=Fri, 12 Jan 2018`;
    //save new cookie
    document.cookie = `${name}=${JSON.stringify(newInventory)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}

//user cookies do not expire automatically
//there are two user cookies: the user's name and the user's location
//form is the form where the user is submitting their info.
function setUserInfoCookie(form: HTMLFormElement){
    //delete old cookies
    document.cookie="userName=;expires=Fri, 12 Jan 2018";
    document.cookie="location=;expires=Fri, 12 Jan 2018";
    //save new cookies
    document.cookie = `userName=${form.nameInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
    document.cookie = `location=${form.locationInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
}

//prepList is an array of PrepItems to be saved
//name is the name that the cookie will be saved under
function setPrepListCookie(prepList: PrepItem[], name:string){
    //delete old cookie
    document.cookie=`${name}=;expires=Fri, 12 Jan 2018`;
    //save new cookie
    document.cookie = `${name}=${JSON.stringify(prepList)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}

//parses and returns an array of location names from a hardcoded json string
function getLocations(): string[]{
    const jsonStrLocations = '[ "Norcross", "Settlers Green", "The Commissary", "Portland", "Portsmouth", "Hub Hall", "Big Cheddah", "Monterey Jack", "Pepper Jack" ]';
    return JSON.parse(jsonStrLocations);
}

//creates a form to collect user name and location
//locations is an array of location names
//id is the name of the HTML id where the form will be created (most commonly "body")
function userInfo(locations: string[], id: string){
    let completeHTML: string = '';
    let locationOptions: string = '';
    const nameLabel: string = `<label for="nameInput">First Name</label><br>`;
    const nameInput: string = '<input type="string" name="nameInput" id="nameInput"><br>';
    const locationLabel: string = '<label for=locationInput">Location</label><br>';
    locations.forEach ((location: string) => {
        const newOption: string = `<option value="${location}">${location}</option>`
        locationOptions += newOption;
    })
    const locationInput: string = `<select name="location" id="locationInput">${locationOptions}</select><br>`;
    completeHTML = `<h1>Input User Info.</h1><form id="userInfoForm">${nameLabel}${nameInput}${locationLabel}${locationInput}<input type="submit" value="Submit" class="center"></form>`
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }
}

//creates a form to collect inventory
//id is the name of the HTML id where the form will be created (most commonly "body")
//pulls list of items to inventory using getItems()
async function inventoryForm (id: string){
    let completeHTML: string = "";
    let items: Item[] = getItems();
    items.forEach ((Item) => {
        const label: string = `<label for="${Item.itemName}Input">${Item.batchUnitName}s of ${Item.itemName}</label><br>`;
        const input: string = `<input type="number" step="any" name="${Item.itemName}Input"><br>`;
        completeHTML += label + input;
    })
    completeHTML = `<h1>Input Inventory</h1><form id="inventoryForm">${completeHTML}<input type="submit" value="Submit" class="center"></form>`;
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("inventoryForm did not find an HTML element where one was expected");
    }
}

//returns a string of HTML code for table rows for a preplist
//prepList is an array of PrepItems to be prepped
//name is the name of the preplist that these rows will be a part of (for example "final" or "extra")
//cookieName is the name of the cookie where a user's previous progress in the preplist is saved
//completeHTML is an optional argment containing a string of HTML code which this new code should be appended to
function makeHTMLPrepRows (prepList: PrepItem[], name: string, cookieName:string, completeHTML: string = ''){
    const progress: Record<string, number> = parseCookie(getCookie(cookieName),cookieName);
    prepList.forEach ((PrepItem) => {
        const row: string = `<tr><td>${PrepItem.itemName}</td><td>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td>${PrepItem.totalBatchTime} min</td><td><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></td></tr>`;
        completeHTML += row;
    })
    return completeHTML;
}

//returns a string of HTML code for table rows for a preplist that will be displayed as strong
//prepList is an array of PrepItems to be prepped
//name is the name of the preplist that these rows will be a part of (for example "final" or "extra")
//cookieName is the name of the cookie where a user's previous progress in the preplist is saved
//completeHTML is an optional argment containing a string of HTML code which this new code should be appended to
function makeHTMLPrepRowsStrong (prepList: PrepItem[], name: string, cookieName:string, completeHTML: string = ''){
    if (getCookie(cookieName) !== undefined){
        console.log('the cookie exists!')
        const progress: Record<string, number> = parseCookie(getCookie(cookieName), cookieName);
        prepList.forEach ((PrepItem) => {
            let row: string = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></strong></td></tr>`;
            completeHTML += row;
        })
    }else{
        console.log('the cookie doesnt exist!')
        prepList.forEach ((PrepItem) => {
            let row: string = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="0"></strong></td></tr>`;
            completeHTML += row;
        })
    }
    
    return completeHTML;
}

//returns a string of HTML code for the Final Prep List
//completeHTML is a string of HTML code for the table rows for all items to be included in the Final Prep List
function makeFinalPrepList (completeHTML: string){
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
    const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }
        else {
            console.log("finalPrepList did not find an HTML element where one was expected");
        }
}

//TODO: for Ian, describe what this function is doing with firebase
//checks if the Final Prep List is completed
//if so, creates the Extra Prep List or displays end page depending on whether there is anything on the extra prep list
//extraPrepList is an array of PrepItems to be prepped on the Extra Prep List
function displayExtraEnd(extraPrepList: PrepItem[]){
    const finalPrepProgressStr = getCookie('finalPrepProgress');
    const finalPrepProgress = JSON.parse(finalPrepProgressStr !== undefined ? finalPrepProgressStr : 'error');
    const location = getCookie('location');
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    const timeStr =  `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()>9?'':'0'}${now.getSeconds()}`;
    const user = getCookie('userName');
    
    let dbRef = firebase.database().ref(`/Prep Record/${location}/${todayStr}`);
    dbRef.set(finalPrepProgress);
    dbRef.update({'user': user});
    dbRef.update({'time': timeStr});
    if (extraPrepList[0]){
        let completeHTML: string = "";
        extraPrepList.forEach ((PrepItem) => {
            let row: string = `<tr><td>${PrepItem.itemName}</td><td>${PrepItem.prepThisWeek}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</td><td>${PrepItem.totalBatchTime} min</td><td><input class="extraPrepListInput" type="number" id="extraPrepList${PrepItem.itemName}"></td></tr>`;
            completeHTML += row;
        })
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
        const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }else {
            console.log("displayExtraEnd did not find an HTML element where one was expected");
        }
        const submitButton = document.getElementById('submitButtonExtra');
        submitButton?.addEventListener('click', () => {
            const inputs = document.getElementsByClassName('extraPrepListInput') as HTMLCollectionOf<HTMLInputElement>; 
            var isUnfilled = false;
            for(let x = 0; x < inputs.length; x++) {
                if(inputs[x].type == 'number' && !inputs[x].value) {
                    isUnfilled = true;
                }
            }
            if(isUnfilled){
                alert('You have not completed this prep list! Prep all the items to finish prep.');
            }else{
                nothingToPrep();
            }
        })
    }else if(!extraPrepList[0]){
        nothingToPrep();
    }
}

//converts data from an HTML form to a record
//formData is the HTML form data to be converted
function formDataToRecord(formData: FormData): Record<string, number> {
    const record: Record<string, number> = {};
    formData.forEach((value, key) => {
       record[String(key).split("Input")[0]] = Number(value);
    });
    return record;
}

//calculates how much of an item we should prep to be ready for tomorrow
//item is the item we would like to do this calulation for
//tomorrowSales is how much we are predicted to do in sales tomorrow (based on past sales data)
//currentInventory is how much of this item we currently have in our inventory
//returns a number of batches needed for tomorrow
function calcNeededTomorrow (item: Item, tomorrowSales: number, currentInventory: { [id: string]: number }): number{
    let neededTomorrow = roundToNearestTenth((tomorrowSales * item.batchesPerSaleDollar * 1.25)-currentInventory[item.itemName]);
    return neededTomorrow;
}

//calculates how much of an item we should prep to be ready for this week
//item is the item we would like to do this calulation for
//thisWeekSales is how much we are predicted to do in sales this week (based on past sales data)
//tomorrowSales is how much we are predicted to do in sales tomorrow (based on past sales data)
//currentInventory is how much of this item we currently have in our inventory
//returns a number of batches needed for this week
function calcNeededThisWeek (item: Item, thisWeekSales: number, tomorrowSales:number, currentInventory: { [id: string]: number }): number{
    let neededThisWeek = Math.floor((thisWeekSales * item.batchesPerSaleDollar * 0.85)-currentInventory[item.itemName]);// this is floored because we are looking for an underestimate of whole batches to prep for next week, rather than what we will absolutely need for tomorrow (which is why calcNeededTomorrow isn't floored)
    if (neededThisWeek <= 0 && calcNeededTomorrow(item, tomorrowSales, currentInventory) > 0){
        neededThisWeek = 1;
    }
    return neededThisWeek;
}

//checks the priority level of an item and returns a number rating its priority
//A priority level of 0 means not needed, 1 means needed this week but not ASAP, 2 means needed ASAP
//item is the item to be checked
//thisWeekSales is how much we are predicted to do in sales this week (based on past sales data)
//tomorrowSales is how much we are predicted to do in sales tomorrow (based on past sales data)
//currentInventory is how much of this item we currently have in our inventory
function checkPriorityLevel (item: Item, thisWeekSales: number, tomorrowSales: number, currentInventory: { [id: string]: number }): number{
    const neededTomorrow: number = calcNeededTomorrow(item, tomorrowSales, currentInventory);
    const neededThisWeek: number = calcNeededThisWeek(item, thisWeekSales, tomorrowSales, currentInventory);
    if (neededTomorrow < 0 || neededTomorrow === 0) {
        if (neededThisWeek > 0){
            return 1;
        }
        else {
            return 0;
        }
    }
    else if (neededTomorrow > 0){
        return 2;
    }else{
        console.log("oh nooooooo -with love, checkPriorityLevel");
        return 0;
    }   
}

//creates an HTML page that informs the user that there is nothing else to prep
function nothingToPrep(){
    let completeHTML = '<h2>There is nothing to prep!</h2>'
        const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }
        else {
            console.log("nothingToPrep did not find an HTML element where one was expected");
        }
}

//1. creates a table that allows the user to select which low priority items to prep
//2. allows the user to see how much prep time they have left as they make their selections
//3. upon submission, checks that the user has filled up all their prep time and, if so, displays the final prep list
//highPriorityUnfinished is an array of PrepItems which are ingredients and need to be prepped for tomorrow
//highPriorityFinished is an array of PrepItems which are finished items and need to be prepped for tomorrow
//prepList is an array of PrepItems which could be prepped for this week
//lowPrioritySelected and extraPrep are empty arrays of PrepItems
//remainingPrepTime is how much prep time the user has left after subtracting the prep time for high priority items
//id is the HTML id for the locations where the table will be created
function sortPrepListByUi (highPriorityUnfinished: PrepItem[], highPriorityFinished: PrepItem[], prepList: PrepItem[], lowPrioritySelected: PrepItem[], extraPrep: PrepItem[], remainingPrepTime: number, id: string){
    //1. create table
    let completeHTML: string = "";
    prepList.forEach ((PrepItem) => {
        let row: string = `<tr><td>${PrepItem.itemName}</td><td><input class="lowPriorityUiCheckbox" type="checkbox" id="lowPrioritySelectionTable${PrepItem.itemName}"></td><td>${PrepItem.totalBatchTime} min</td></tr>`;
        completeHTML += row;
    })
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
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("sortPrepListByUi did not find an HTML element where one was expected");
    }
    //2. allow the user to select which low priority items to prep and display the remaining prep time as they make their selections
    let displayPrepTime: number = remainingPrepTime;
    prepList.forEach((PrepItem) => {
        const checkbox = document.getElementById(`lowPrioritySelectionTable${PrepItem.itemName}`) as HTMLInputElement;
        checkbox.addEventListener('change', () => {
            const header = document.getElementById('remainingPrepTime');
            if(header){
                if(checkbox.checked){
                    displayPrepTime -= Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }else if(!checkbox.checked){
                    displayPrepTime += Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }
            } else {
                console.log('sortPrepListByUi did not identify the low priority selection table properly');
            }
        })
    })
    //3. upon submission check that the user has filled all their prep time
    const submitButton = document.getElementById('submitButton');
    submitButton?.addEventListener('click', () => {
        if (displayPrepTime <= 0){
            //if prep time is equal to or less than 0, push checked items to shorterPrepList and unchecked items to extraPrepList
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox') as HTMLCollectionOf<HTMLInputElement>;
            for(let x = 0; x < checkboxes.length; x++) {
                if(checkboxes[x].type == 'checkbox') {
                    if (checkboxes[x].checked) {
                        lowPrioritySelected.push(prepList[x]);
                    } else if (!checkboxes[x].checked){
                        extraPrep.push(prepList[x]);
                    }
                }
            }
            displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
        }else if (displayPrepTime > 0){
            //if prep time is greater than 0, then check whether the user can check more items, if not push checked items to shorterPrepList and unchecked items to extraPrepList
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox') as HTMLCollectionOf<HTMLInputElement>;
            var isUnchecked = false;
            for(let x = 0; x < checkboxes.length; x++) {
                if(checkboxes[x].type == 'checkbox') {
                    isUnchecked = !checkboxes[x].checked;
                    if(isUnchecked) break;
                }
            }
            if(!isUnchecked){
                for(let x = 0; x < checkboxes.length; x++) {
                    if(checkboxes[x].type == 'checkbox') {
                        if (checkboxes[x].checked) {
                            lowPrioritySelected.push(prepList[x]);
                        } else if (!checkboxes[x].checked){
                            extraPrep.push(prepList[x]);
                        }
                    }
                }
                displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
            }else if(isUnchecked){
                alert('You have more prep time remaining, please select more items to prep!');
            }
        }
    })
}

//sorts PrepItems on a given preplist based on whether they are finished items
//prepList is an array of PrepItems which will be sorted into lists of finished and unfinished items
function sortPrepListByFinished(prepList: PrepItem[]):[PrepItem[],PrepItem[]]{
    const unfinished: PrepItem[] = [];
    const finished: PrepItem[] = [];
    prepList.forEach((PrepItem) => {
        if(PrepItem.finishedItemBool === true){
            finished.push(PrepItem);
        }
        else{
            unfinished.push(PrepItem);
        }
    })
    return [unfinished, finished];
}

//1. checks the priority of each item on the item list and sorts them into high priority, low priority, and dont prep lists
//2. adjusts the priority of ingredients based on the priority of the item they are used to make
//3. calculates how long it will take to prep all the high priority ingredients
//4. calculates how much prep time the user has left after removing the prep time for high priority items
//5. sorts high priority items by thier total batch time in descending order
//6. sorts high priority items into finished and unfinished item lists
//7. sorts the low priority prep list if needed, and otherwise displays the Final Prep List or the end page
function makePrepList (){
    let highPriorityPrepTime = 0;
    let highPriority: PrepItem[] = [];
    let lowPriority: PrepItem[] = [];
    let dontPrep: PrepItem[] = [];
    let highPriorityUnfinished: PrepItem[] = [];
    let highPriorityFinished: PrepItem[] = [];
    let lowPrioritySelected: PrepItem[] = [];
    let extraPrep: PrepItem[] = [];
    let arrayOfItems: Item[] = getItems();
    let prepHours:number = getPrepHours();
    let prepMinutes:number = prepHours * 60;
    let thisWeekSales:number = getThisWeekSales();
    let tomorrowSales:number = getTomorrowSales();
    const inventoryCookie = getCookie(inventoryCN);
    const currentInventory: { [id: string]: number } = parseCookie(inventoryCookie,inventoryCN);

    const location = getCookie('location');
    const user = getCookie('userName');
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    const dbRef = firebase.database().ref(`/Inventory Record/${location}/${todayStr}/${timeStr}`);
    dbRef.set(currentInventory);
    dbRef.update({'user': user});

    //1. sort items by priority
    arrayOfItems.forEach((Item) => {
        const newPrepItem = new PrepItem (Item.itemName,Item.batchUnitName,Item.batchTimeMinutes,calcNeededThisWeek(Item, thisWeekSales, tomorrowSales, currentInventory), calcNeededTomorrow(Item, tomorrowSales, currentInventory), Item.finishedItemBool, Item.ingredients);
        switch (checkPriorityLevel(Item, thisWeekSales, tomorrowSales, currentInventory)){
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
    })
    //2. adjust ingredient priority
    dontPrep.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined){
            if(PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1){
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        dontPrep.push(ingredientItem);
                    }else{
                        let ingredientIndexLp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                        if(ingredientIndexLp > -1){
                            let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                            dontPrep.push(ingredientItem);
                        }else{}
                    }
                }) 
            }
        }else{}
    })
    lowPriority.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined){
            if (PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1){
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        lowPriority.push(ingredientItem);
                    }else{}
                }) 
            }else{}
        }else{}
    })
    highPriority.forEach((PrepItem) => { //check if the high priority items have ingredients that need making... may need fixing
        if (PrepItem.finishedItemBool !== undefined){
            if (PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexLp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexLp > -1){
                        let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                        highPriority.push(ingredientItem);
                    }else{
                        let ingredientIndexDp = dontPrep.findIndex(obj => obj.itemName === ingredient);
                        if(ingredientIndexDp > -1){
                            let ingredientItem = dontPrep.splice(ingredientIndexDp, 1)[0];
                            highPriority.push(ingredientItem);
                        }else{}
                    }
                }) 
            }else{}
        }else{}
    });
    
    //3. calculate high priority prep time
    highPriority.forEach((PrepItem) => {
        if(PrepItem !== undefined) {
            highPriorityPrepTime += PrepItem.totalBatchTime;
        }
    });

    //4. calculate remaining prep time
    let remainingPrepTime = prepMinutes - highPriorityPrepTime;

    //5. sort highPriority by totalBatchTime in descending order
    highPriority.sort((a, b) => b.totalBatchTime - a.totalBatchTime);

    //6. sort highPriority into finished and unfinished item lists
    [highPriorityUnfinished, highPriorityFinished] = sortPrepListByFinished(highPriority);

    //7. sort low priority prep list if needed, otherwise display the Final Prep List or the end page
    if (remainingPrepTime > 0 && lowPriority[0]) {
        sortPrepListByUi(highPriorityUnfinished, highPriorityFinished, lowPriority, lowPrioritySelected, extraPrep, remainingPrepTime,"body");
    }else if (highPriorityFinished[0] || highPriorityUnfinished[0]){
        displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, lowPriority);
    }else{
        nothingToPrep();
    }
}

//1. saves each prep list in its final form
//2. creates the Final Prep List page
//3. saves prep progress
//4. on submit, checks that all items have been prepped and alerts user if any seem low or high 
//then either displays the extra prep page or the end page
//highPriorityUnfinished is an array of PrepItems which are ingredients and need to be prepped for tomorrow
//highPriorityFinished is an array of PrepItems which are finished items and need to be prepped for tomorrow
//lowPrioritySelected is an array of PrepItems which could be prepped for the week and were selected by the user to prep today
//extraPrepList is an array of PrepItems which could be prepped for the week but were not selected by the user to prep today
function displayPrepLists (/*prepLists: Array<PrepItem[]>, extraPrepList: PrepItem[] */highPriorityFinished: PrepItem[] = [], highPriorityUnfinished: PrepItem[], lowPrioritySelected: PrepItem[], extraPrepList: PrepItem[]){
    let completeHTML: string = "";
    let finalPrepList: PrepItem[] =[];
    //1. save preplists
    setPrepListCookie(highPriorityFinished, highPriorityFinishedCN);
    setPrepListCookie(highPriorityUnfinished, highPriorityUnfinishedCN);
    setPrepListCookie(lowPrioritySelected, lowPrioritySelectedCN);
    setPrepListCookie(extraPrepList, extraPrepListCN);

    //TROUBLESHOOTING NOTE: if the following is not working correctly, try changing the cookie string passed to the makeHTMLPrep functions from finalPrepProgress to hPF, hPU, and lPS
    
    //2. create Final Prep List page
    //add high priority prep lists with strong
    completeHTML += makeHTMLPrepRowsStrong(highPriorityUnfinished,'final', finalPrepProgressCN);
    completeHTML += makeHTMLPrepRowsStrong(highPriorityFinished,'final', finalPrepProgressCN);

    //add a separator between high and low priority prep lists
    const separator: string = `<tr class= "separator"><td></td><td></td><td></td><td></td></tr>`;
    completeHTML += separator;

    //add low priority prep list
    completeHTML += makeHTMLPrepRows(lowPrioritySelected,'final',finalPrepProgressCN);

    //display page
    makeFinalPrepList(completeHTML);

    //make final prep list
    highPriorityFinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })
    highPriorityUnfinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })
    lowPrioritySelected.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })

    
    //3. save prep progress
    //create prep progress object
    const finalPrepProgress: Record<string, number> = {};
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`) as HTMLInputElement;
        finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
        setInventoryCookie(finalPrepProgress, finalPrepProgressCN);
    })

    //save prep progress
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`) as HTMLInputElement;
        input.addEventListener('input', () => {
            finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
            setInventoryCookie(finalPrepProgress, finalPrepProgressCN);
        })
    })

    //4. on submit, check that all items have been prepped and alert user if any seem low or high then either display the extra prep page or the end page
    const submitButton = document.getElementById('submitButton');
    submitButton?.addEventListener('click', () => {
        const inputs = document.getElementsByClassName('finalPrepListInput') as HTMLCollectionOf<HTMLInputElement>; 
        var isUnfilled = false;
        for(let x = 0; x < inputs.length; x++) {
            if(inputs[x].type == 'number' && !inputs[x].value) {
                isUnfilled = true;
            }
        }
        if(!isUnfilled){
            //check if any inputs seem low or high
            let belowMin = false;
            let aboveMax = false;
            for(let x = 0; x < finalPrepList.length; x++) {
                if(finalPrepProgress[finalPrepList[x].itemName] < finalPrepList[x].prepTomorrow) {
                    belowMin = true;
                }
            }
            for(let x = 0; x < finalPrepList.length; x++) {
                if(finalPrepProgress[finalPrepList[x].itemName] > finalPrepList[x].prepThisWeek) {
                    aboveMax = true;
                }
            }
            if (!aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow. Are you sure you're done with this prep list?`)){
                displayExtraEnd(extraPrepList);
               //TODO dummy function to save inputs permanently
            }else if (aboveMax && !belowMin && confirm(`At least one of your entries is above the amount needed for next week. Are you sure you entered the amount correctly?`)){
                displayExtraEnd(extraPrepList);
            }else if (aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow AND at least one of your entries is above the amount needed for next week. Are you sure you entered all the amounts correctly and you're done with this prep list?`)){
                displayExtraEnd(extraPrepList);
            }else if (!aboveMax && !belowMin){
                displayExtraEnd(extraPrepList);
            }

        }else if(isUnfilled){
            alert('You have not completed this prep list! Prep all the items to access the extra prep list.');
        }
    })
}

async function getItemJson(location: string = 'Norcross'): Promise<string> {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Item Lists').child(location).get().then( (snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getItemJson: ${error}`);
    });
    return jsonStrItems;
}

async function getSalesHoursJson(location: string = 'Norcross'): Promise<string> {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Sales and Hours').child(location).get().then( (snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getSalesHoursJson: ${error}`);
    });
    return jsonStrItems;
}

async function getAllSalesHoursJson(): Promise<string> {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Sales and Hours').get().then( (snapshot) => {
        if (snapshot.exists()) {
            jsonStrItems = JSON.stringify(snapshot.val());
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getSalesHoursJson: ${error}`);
    });
    return jsonStrItems;
}

//TODO: for Ian, describe what this function is doing with firebase
//1. on submission of the User Info Form, checks that the user has input their name
//2. checks if there is a previously saved inventory and, if so, asks the user if they would like to use that
//3. otherwise, goes on to allow the user in input a new inventory
async function collectInfo(){
    const form = document.getElementById('userInfoForm') as HTMLFormElement;
    let body = document.getElementById('body');
    if(form){
        await form.addEventListener('submit', async (event) => {
            event.preventDefault();
            //1. check if the user has input a name
            if (form.nameInput.value){
                if (body !== null) {
                    body.innerHTML = `<p id="loading">Loading</p><div class="loader"></div>`;
                }
                setUserInfoCookie(form);

                //2. check for a saved prep list
                const hPF = getCookie(highPriorityFinishedCN);
                const hPU = getCookie(highPriorityUnfinishedCN);
                const lPS = getCookie(lowPrioritySelectedCN);
                const ePL = getCookie(extraPrepListCN);

                const highPriorityFinished = parseCookie(hPF,highPriorityFinishedCN);
                const highPriorityUnfinished = parseCookie(hPU,highPriorityUnfinishedCN);
                const lowPrioritySelected = parseCookie(lPS,lowPrioritySelectedCN);
                const extraPrepList = parseCookie(ePL,extraPrepListCN);

                const inventoryCookie = getCookie(inventoryCN);

                
                let dataString = await getFirebaseData(getCookie('location'));
                setSpreadsheetDataCookies(dataString);
                
                if (highPriorityFinished && confirm("A saved prep list was found. Do you want to use that preplist?")) {
                    displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, extraPrepList);
                }else if (inventoryCookie && confirm("A previously submitted inventory was found. Do you want to use that inventory?")) {
                    //clear preplist progress if not using saved preplist
                    setInventoryCookie({},finalPrepProgressCN);
                    makePrepList();
                }else{
                    //clear preplist progress if not using saved preplist
                    setInventoryCookie({},finalPrepProgressCN);
                    //3. otherwise, have the user input a new inventory
                    inventoryForm('body');
                    collectInventory();
                }
            }else if(!form.nameInput.value){
                alert('Please input your name');
            }else{
                console.log('oh nooo From: collectInfo');
            }
        })
    }else{
        console.log('collectInfo did not find a form');
    }
}

//on submission of the Inventory Form, checks that there are no negative inputs and alerts the user if any inputs seem especially high
function collectInventory(){
    const form = document.getElementById('inventoryForm') as HTMLFormElement;
    if(form){
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const inventory = formDataToRecord(formData);
            let negativeEntry = false;
            let seemsHigh = false;
            Object.entries(inventory).forEach((x: [string,number]) => {
                if(x[1] < 0){
                    negativeEntry = true;
                }
            })
            Object.entries(inventory).forEach((x: [string,number]) => {
                if(x[1] > 99){
                    seemsHigh = true;
                }
            })
            if (negativeEntry){
                alert('You cannot submit a negative value for inventory');
            }else if(!negativeEntry && seemsHigh){
                if(confirm('At least one of your entries seems a little high. Are you sure this inventory is correct?')){
                    setInventoryCookie(inventory, inventoryCN);
                    makePrepList();
                }else{}
            }else if (!negativeEntry){
                setInventoryCookie(inventory, inventoryCN);
                makePrepList();
            }
        })
    }
}

function getItems(locationStr: string = ''): Item[] {
    let itemArrStr = getCookie('itemArr');
    if(false) { console.log(locationStr); console.log(itemArrStr); };
    let localStorageItemArr = localStorage.getItem('itemArr');
    if(localStorageItemArr === null) {        
        console.log(`Error in getItems`);
        return JSON.parse("\"error\"");
    } 
    else {
        return JSON.parse(localStorageItemArr);
    }
    /*
    if(itemArrStr === undefined) {
        console.log('Whoops, the Item cookie failed! Using local storage instead :)');
        let localStorageItemArr = localStorage.getItem('itemArr');
        if(localStorageItemArr === null) {
            return JSON.parse("\"error\"")
        } 
        else {
            return JSON.parse(localStorageItemArr);
        }
        //return JSON.parse("\"error\"");
    } else {
        return JSON.parse(itemArrStr);
    }
        */
}

function getPrepHours(locationStr: string = ''): number{
    let prepHoursStr = getCookie('todayPrepHours');
    if(false) { console.log(locationStr); console.log(prepHoursStr); };
    let localStoragePrepHours = localStorage.getItem('todayPrepHours');
    if(localStoragePrepHours === null) {
        console.log(`Error in getPrepHours`);
        return JSON.parse("\"error\"");
    } 
    else {
        return JSON.parse(localStoragePrepHours);
    }
    /*
    // console.log(getCookie('todayPrepHours'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('todayPrepHours'));
    */
}

function getTomorrowSales(locationStr: string = ''): number{ // TODO: Check if null/undefined and throw error
    let tomorrowSalesStr = getCookie('tomorrowSales');
    if(false) { console.log(locationStr); console.log(tomorrowSalesStr); };
    let localStorageTomorrowSales = localStorage.getItem('tomorrowSales');
    if(localStorageTomorrowSales === null) {
        console.log(`Error in getTomorrowSales`);
        return JSON.parse("\"error\"");
    } 
    else {
        return JSON.parse(localStorageTomorrowSales);
    }
    /*
    // console.log(getCookie('tomorrowSales'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('tomorrowSales'));
    */
}

function getThisWeekSales(locationStr: string = ''): number{
    let thisWeekSalesStr = getCookie('tomorrowSales');
    if(false) { console.log(locationStr); console.log(thisWeekSalesStr); };
    let localStorageThisWeekSales = localStorage.getItem('thisWeekSales');
    if(localStorageThisWeekSales === null) {
        console.log(`Error in getThisWeekSales`);
        return JSON.parse("\"error\"");
    } 
    else {
        return JSON.parse(localStorageThisWeekSales);
    }
    /*
    // console.log(getCookie('thisWeekSales'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('thisWeekSales'));
    */
}

function setSpreadsheetDataCookies(data: string[]) {
    //TODO: rework this function to take in a record with labels for the array types to make it more robust
    
    // console.log("JSON string array passed to the cookie setter function:");
    // console.log(data);

    //Store full sales & hours data JSON
    //1. delete the old cookie, if it exists
    document.cookie=`salesHoursArr=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `salesHoursArr=${data[0]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    //TODO: for some reason the sales hours array is saving as data[0] in the coookie...
    
    //store item JSON
    //1. delete the old cookie, if it exists
    document.cookie=`itemArr=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `itemArr=${data[1]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('itemArr',data[1]);

    //store today prep hours data
    //1. delete the old cookie, if it exists
    document.cookie=`todayPrepHours=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `todayPrepHours=${data[2]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('todayPrepHours',data[2]);

    //store tomorrow sales data
    //1. delete the old cookie, if it exists
    document.cookie=`tomorrowSales=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `tomorrowSales=${data[3]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('tomorrowSales',data[3]);

    //store this week sales data
    //1. delete the old cookie, if it exists
    document.cookie=`thisWeekSales=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `thisWeekSales=${data[4]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    localStorage.setItem('thisWeekSales',data[4]);

    if(false) {
        onLoad();
        onLoadGmPage();
        collectGmInfo();
        // getSpreadsheetData();
    }
}

function onLoad(){
    const locations: string[] = getLocations();
    userInfo(locations, 'body');
    collectInfo();
}

async function onLoadGmPage() {
    const locations: string[] = getLocations();
    const salesHours: string = await getAllSalesHoursJson();
    createSalesHoursTable(locations, salesHours, 'locationInfoEditor');
    //collectGmInfo();

}


async function createSalesHoursTable(locations: string[], salesHours: string, id: string){ //Started on 6/26. I need to make a table with all of the locations and their sales and prep hours, all of which are editable, and a submit button then a handler function for that button which will store the info
    if(false) { console.log(salesHours); }
    
    let completeHTML: string = '';
    let locationOptions: string = '';
    const nameLabel: string = `<label for="nameInput">First Name</label><br>`;
    const nameInput: string = '<input type="string" name="nameInput" id="nameInput"><br>';
    const locationLabel: string = '<label for=locationInput">Location</label><br>';
    locations.forEach ((location: string) => {
        const newOption: string = `<option value="${location}">${location}</option>`
        locationOptions += newOption;
    })
    const locationInput: string = `<select name="location" id="locationInput" multiple>${locationOptions}</select><br>`;
    completeHTML = `<h1>Input User Info.</h1><form id="userInfoForm">${nameLabel}${nameInput}${locationLabel}${locationInput}<input type="submit" value="Submit" class="center"></form>`
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }

    //Make 2d array with location columns and day rows and hours and sales as data
    
    // const hoursSalesArr: any[SalesHoursObj];

    // const salesHoursObj: AllSalesHoursObj = JSON.parse(salesHours);
    // console.log(salesHoursObj);
    const salesTable: HTMLElement | null = document.getElementById('hoursSalesEditorTable');
    let tableHtml = `<thead><tr><th scope="col"></th>`;
    for(let i = 0; i < locations.length; i++) {
        // hoursSalesArr[i] =  getThisWeekSalesArr(locations[i]);
        let salesArr = await getThisWeekSalesArr(locations[i]);
        if(i === 0) {
            salesArr.forEach(day => {
                tableHtml += `<th scope="col">${day["Date"]}</th>`;
            });
            tableHtml += `</tr></thead><tbody>`;
        }
        tableHtml += `<tr><th scope="row">${locations[i]}</th>`
        salesArr.forEach(day => {
            tableHtml += `<td scope="col"><div contenteditable>${day["Historical Sales"]}</div></td>`;
        });
        //tableHtml += `<th scope="col">${locations[i]}</th>`;
        //<div contenteditable>I'm editable</div>
    }

    if(salesTable) {
        salesTable.innerHTML = tableHtml;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }

    // for(let i = 0; i <= 14; i++) {
    //     if(i = 0) { //Add the header row
    //         hoursSalesArr[i] = locations;
    //         hoursSalesArr[i].unshift('');
    //     }
    //     else { //Add a data row
    //         if(hoursSalesArr[i] === undefined) {
    //             hoursSalesArr[i] = [];
    //         }
            

    //     }
    // }
    // console.log(hoursSalesArr);

    // const table: HTMLElement | null = document.getElementById('hoursSalesEditorTable');
    // completeHTML = '';
    // locations.forEach ((location: string) => {
    //     const newOption: string = `<option value="${location}">${location}</option>`
    //     locationOptions += newOption;
    // });
    
}

async function collectGmInfo(){
    const form = document.getElementById('userInfoForm') as HTMLFormElement;
    let body = document.getElementById('body');
    if(form){
        await form.addEventListener('submit', async (event) => {
            event.preventDefault();
            //1. check if the user has input a name
            if (form.nameInput.value){
                if (body !== null) {
                    body.innerHTML = `<p id="loading">Loading</p><div class="loader"></div>`;
                }
                setUserInfoCookie(form);

                // //2. check for a saved prep list
                // const hPF = getCookie(highPriorityFinishedCN);
                // const hPU = getCookie(highPriorityUnfinishedCN);
                // const lPS = getCookie(lowPrioritySelectedCN);
                // const ePL = getCookie(extraPrepListCN);

                // const highPriorityFinished = parseCookie(hPF,highPriorityFinishedCN);
                // const highPriorityUnfinished = parseCookie(hPU,highPriorityUnfinishedCN);
                // const lowPrioritySelected = parseCookie(lPS,lowPrioritySelectedCN);
                // const extraPrepList = parseCookie(ePL,extraPrepListCN);

                // const inventoryCookie = getCookie(inventoryCN);

                
                // let dataString = await getFirebaseData(getCookie('location'));
                // // console.log(`Data string:`);
                // // console.log(dataString);
                // // console.log(`Item JSON in collectInfo: ${await getItemJson(getCookie('location'))}`);
                // // console.log(`Sales & Hours JSON in collectInfo: ${await getSalesHoursJson(getCookie('location'))}`);
                // setSpreadsheetDataCookies(dataString);
                
                // if (highPriorityFinished && confirm("A saved prep list was found. Do you want to use that preplist?")) {
                //     displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, extraPrepList);
                // }else if (inventoryCookie && confirm("A previously submitted inventory was found. Do you want to use that inventory?")) {
                //     //clear preplist progress if not using saved preplist
                //     setInventoryCookie({},finalPrepProgressCN);
                //     makePrepList();
                // }else{
                //     //clear preplist progress if not using saved preplist
                //     setInventoryCookie({},finalPrepProgressCN);
                //     //3. otherwise, have the user input a new inventory
                //     inventoryForm('body');
                //     collectInventory();
                // }
            }else if(!form.nameInput.value){
                alert('Please input your name');
            }else{
                console.log('oh nooo From: collectInfo');
            }
        })
    }else{
        console.log('collectInfo did not find a form');
    }
}

//**IMPORTANT** The following function(s) need(s) to be placed in the Code.gs file, not the JavaScript.html file
// function getJsonStringFromItemArr(data:any[][] | undefined): string {
//     //see https://stackoverflow.com/questions/47555347/creating-a-json-object-from-google-sheets
//   if(data === undefined) {
//     console.log(`Error with the data in getJsonArrayFromData being undefined`);
//     return '';
//   }
//   var obj:Record<string, Object> = {};
//   var result:Object[] = [];
//   var headers:any[] = data[0];
//   var cols:number = headers.length;
//   var row:any[];

//   for (var i = 1, l = data.length; i < l; i++)
//   {
//     // get a row to fill the object
//     row = data[i];
//     // clear object
//     obj = {};
//     for (var col = 0; col < cols; col++) 
//     {
//       // fill object with new values
//       if(row[col] === 'true' || row[col] === 'false') { //converts bools to Boolean
//         obj[headers[col]] = (row[col] === 'true');
//       } else if (String(row[col])[0] === '[') {
//         obj[headers[col]] = JSON.parse(row[col]); //keeps arrays as arrays
//       } else {
//         obj[headers[col]] = String(row[col]);
//       }

//     }
//     // add object in a final result
//     result.push(obj);  
//   }
//   console.log(result);
//   return JSON.stringify(result);
// }

// function getJsonStringFromSalesArr(data:any[][] | undefined): string {
//     if(data === undefined) {
//         console.log(`Error with the data in getJsonArrayFromData being undefined`);
//         return '';
//       }
//       var result:(string|number)[][] = [[]];
//       var headers:any[] = data[0];
//       var cols:number = headers.length;
//       var row:any[];
    
//       for (var i = 0, l = data.length; i < l; i++)
//       {
//         // get a row to fill the object
//         row = data[i];
//         result[i] = [];
//         for (var col = 0; col < cols; col++) 
//         {
//             if(!isNaN(Number(row[col])) && String(row[col]).trim() !== '') { //check if number
//                 result[i][col] = Number(row[col]);
//             } else {
//                 result[i][col] = String(row[col]);
//             }    
//         }
//       }
//       console.log(result);
//       return JSON.stringify(result);
// }

async function getThisWeekSalesArr(locationStr: string): Promise<SalesHoursObj[]> {
    const salesArr: SalesHoursObj[] | undefined = JSON.parse(await getSalesHoursJson(locationStr));
    let thisWeekSalesArr: SalesHoursObj[] = [];
    //get prep hours
    const today: Date = new Date();
    const todayStr: string = `${today.getMonth()+1}-${today.getDate()}-${today.getFullYear()}`;
    let row: number = 0;
    
    // console.log(salesArr);

    if(salesArr === undefined) {
        console.log(`In getPrepHours; salesArr is undefined`);
    }
    else {
        while( row < salesArr.length && String(salesArr[row]['Date']) !== todayStr) {
            row++;
        }
   }
    //get tomorrow sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getTomorrowSales; salesArr is undefined`);
    } else {
        while( row < salesArr.length && String(salesArr[row]['Date']) !== todayStr ) {
            row++;
        }
        // console.log(`Todays date of ${todayStr} found at row ${row} with value ${salesArr[row]['Historical Sales']} dollars`);
  }
    
    //calculate this week sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getThisWeekSales; salesArr is undefined`);
    } else {
        while( row < salesArr.length && String(salesArr[row]['Date']) !== todayStr ) {
            row++;
        }
        for(let i = 1; i <= 7; i++) {
            thisWeekSalesArr[i-1] = salesArr[row+i];
        }
    }

    return thisWeekSalesArr;

}

async function getFirebaseData(locationStr: string = ''): Promise<string[]> {
    const salesArr: SalesHoursObj[] | undefined = JSON.parse(await getSalesHoursJson(locationStr));
    let thisWeekSalesArr: SalesHoursObj[] = [];
    let todayPrepHours: number;
    let tomorrowSales: number;
    let thisWeekSales: number = 0;

    //get prep hours
    const today: Date = new Date();
    const todayStr: string = `${today.getMonth()+1}-${today.getDate()}-${today.getFullYear()}`;
    let row: number = 0;

    if(salesArr === undefined) {
        console.log(`In getPrepHours; salesArr is undefined`);
        todayPrepHours = 8;
    }
    else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        if (locationStr){
            todayPrepHours = Number(salesArr[row]['Prep Hours']); 
        }else{
            console.log('Error in getSpreadsheetData with prep hours; default to 8');
            todayPrepHours = 8;
        }
    }
    //get tomorrow sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getTomorrowSales; salesArr is undefined`);
        tomorrowSales = 0;
    } else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        if (locationStr){
            tomorrowSales = Number(salesArr[row]['Historical Sales'])+Number(salesArr[row+1]['Historical Sales']); 
        }else{
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 5000');
            tomorrowSales = 5000;
        }
    }
    
    //calculate this week sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getThisWeekSales; salesArr is undefined`);
        thisWeekSales = 0;
    } else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        for(let i = 1; i <= 7; i++) {
            thisWeekSales += Number(salesArr[row+i]['Historical Sales']);
            thisWeekSalesArr[i-1] = salesArr[row+i];
        }
        if (!locationStr){
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 7000');
            thisWeekSales = 7000;
        }
    }

    return [JSON.stringify(thisWeekSalesArr), await getItemJson(), JSON.stringify(todayPrepHours), JSON.stringify(tomorrowSales), JSON.stringify(thisWeekSales),];

}

// function getSpreadsheetData(locationStr: string = ''): string[] {
//     //TODO: rework this function to output a record with labels for the strings to make it more robust
//     const salesArr: object[][] | undefined = SpreadsheetApp.openById('15CvkTxN6k4RjzjKpEqdXsGg68hhH7RXkY_JtqfMxvyQ').getSheetByName(locationStr+' Sales')?.getDataRange().getValues();
//     const itemArr: object[][] | undefined = SpreadsheetApp.openById('15CvkTxN6k4RjzjKpEqdXsGg68hhH7RXkY_JtqfMxvyQ')?.getSheetByName(locationStr+' Item List')?.getDataRange().getValues();
//     let todayPrepHours: number;
//     let tomorrowSales: number;
//     let thisWeekSales: number = 0;

//     //get prep hours
//     const today: Date = new Date();
//     const todayStr: string = `${today.getMonth()+1}/${today.getDate()}/${today.getFullYear()}`
//     let row: number = 0;
//     let hoursCol: number = 0;

//     if(salesArr === undefined) {
//         console.log(`In getPrepHours; salesArr is undefined`);
//         todayPrepHours = 8;
//     }
//     else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Prep Hours') {
//                 hoursCol = i;
//             }
//         }
//         while( String(salesArr[row][0]) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         console.log(`Todays date of ${todayStr} found at row ${row+1} with value ${salesArr[row][hoursCol]} hours`);
//         if (locationStr){
//             todayPrepHours = Number(salesArr[row][hoursCol]); 
//         }else{
//             console.log('Error in getSpreadsheetData with prep hours; default to 8');
//             todayPrepHours = 8;
//         }
//     }
//     //get tomorrow sales
//     row = 0;
//     let salesCol: number = 0;

//     if(salesArr === undefined) {
//         console.log(`In getTomorrowSales; salesArr is undefined`);
//         tomorrowSales = 0;
//     } else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Historical Sales') {
//                 salesCol = i;
//             }
//         }
//         while( (salesArr[row][0] as unknown as string) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         console.log(`Tomorrows date of ${salesArr[row+1][0]} found at row ${row+2} with value ${salesArr[row+1][salesCol]} sales`);
//         if (locationStr){
//             tomorrowSales = Number(salesArr[row+1][salesCol]); 
//         }else{
//             console.log('OH NOoOoO -yours truly, getTomorrowSales');
//             tomorrowSales = 0;
//         }
//     }
    
//     //calculate this week sales
//     row = 0;
//     salesCol = 0;

//     if(salesArr === undefined) {
//         console.log(`In getThisWeekSales; salesArr is undefined`);
//         thisWeekSales = 0;
//     } else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Historical Sales') {
//                 salesCol = i;
//             }
//         }
//         while( String(salesArr[row][0]) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         for(let i = 1; i <= 7; i++) {
//             thisWeekSales += Number(salesArr[row+i][salesCol]);
//         }
//         console.log(`Todays date of ${todayStr} found at row ${row+1} with value ${salesArr[row][salesCol]} sales`);
//         console.log(`This week's sales calcualted to be ${thisWeekSales}`);
//         if (!locationStr){
//             console.log('OH NOoOoO -yours truly, getTomorrowSales');
//             thisWeekSales = 0;
//         }
//     }

//     return [getJsonStringFromItemArr(itemArr), getJsonStringFromSalesArr(salesArr), JSON.stringify(todayPrepHours), JSON.stringify(tomorrowSales), JSON.stringify(thisWeekSales),];
// }