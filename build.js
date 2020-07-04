let fs = require("fs");
let { execSync, exec } = require("child_process");
let path = require('path');



function getAllUnder(base) {
    let allPaths = [];
    let stack = [base];
    while (stack.length) {
        let list = fs.readdirSync(stack[0]);
        for (let i of list) {
            let stat = fs.statSync(stack[0] + "/" + i);
            if (stat.isDirectory()) stack.push(stack[0] + "/" + i);
            else allPaths.push(stack[0] + "/" + i);
        }
        stack.shift();
    }
    return allPaths;
}

(async () => {
    execSync("git add .");
    try {
        execSync('git commit -m "auto pre-push commit" ');
    } catch (err) {
        console.log("no changes to commit, hope this looks right");
    }
    console.log("gatsby building...");
    execSync("gatsby build");
    // drag the files from public to transfer 
    let publics = getAllUnder('public');
    for (let i of publics) {
        fs.mkdirSync('transfer/' + i.slice(0, i.lastIndexOf("/")).slice("public/".length), { recursive: true });
        fs.renameSync(i, 'transfer/' + i.slice("public/".length));
    }
    execSync("git checkout master");
    try {
        execSync("git merge develop");
    } catch (err) {
        console.log("merge failed, please resolve.");
        return;
    }
    // drag the files from transfer to outside
    let transfers = getAllUnder('transfer');
    for (let i of transfers) {
        fs.mkdirSync(i.slice(0, i.lastIndexOf("/")).slice("public/".length), { recursive: true });
        fs.renameSync(i, i.slice("transfer/".length));
    }
    execSync('git add .');
    execSync('git commit -m "auto-deploy"');
    execSync('git push');
    execSync('git checkout develop');
})();

// switch to index build html
// copy the index from the cache into index html
// git add
// git commit 
// git push
