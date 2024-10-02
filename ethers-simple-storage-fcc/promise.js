let promise = new Promise(function(resolve, reject) {
    let rand = Math.floor(Math.random() * 11);
    console.log("随机数是：", rand)
    if (rand % 2 == 0) {
        resolve(rand);
    } else {
        reject(new Error("奇数"));
    }
});

promise.then(function(value) {
    console.log("resolve: " + value);
}, function(err) {
    console.log("reject: ", err);
})

console.log("end");
