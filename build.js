let fs = require("fs");
let { execSync, exec } = require("child_process");
let path = require('path');



function getAllPublic() {
    let allPaths = [];
    let stack = ["public"];
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
    execSync("gatsby build");
    execSync("git checkout master");
    try {
        execSync("git merge develop");
    } catch (err) {
        console.log("merge failed, please resolve.");
        return;
    }
    // drag the files from public to outside
    let publics = getAllPublic();
    for (let i of publics) {
        fs.renameSync(i, i.slice("public/".length));
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
