(function(){

    let http = require("http");

    let https = require("https");

    let utils = require("@ahinnovate/utility_async");

    module.exports = (requestObj, config, tnxId) => {

        let startedAt = new Date();

        let protocol = (config.isSsl) ? https : http;
        let addHeaders = config.addHeaders || false;
        let options = config.gatewayConfig || {};
        if(typeof options.headers === "object") options.headers["x-request-id"] = config.tnxId || "";

        let write = (options.method == "POST");
        let log_options = JSON.stringify(options);

        let incorrectResponse = { "status" : 502, "responseData" : { "errorCode": "ERR502", "message": "Gateway not reachable", "requestDest": options.hostname + ":" + options.port  , "requestUrl": options.path }};
        let requestBody = JSON.stringify(requestObj);

        return new Promise(function(resolve, reject) {

            let logOnlyIfRequired = function(message, tag){
                if(!config.dntLogGateway)  utils.log(message, tag, config);
            }
            let checkJSONResponse = function(response){
                try {
                    return JSON.parse(response);
                }catch(err){
                    let message = "Incorrect Json Format sent from server";
                    logOnlyIfRequired(message, "WebServerGateway");
                    incorrectResponse.responseData.message = message;
                    return incorrectResponse
                }
            };

            let req = protocol.request(options, (res) => {

                let responseData = "";
                if(res.statusCode == "500") resolve(incorrectResponse);

                res.on("data", (dataChunk) => {
                    responseData = responseData + dataChunk;
                });

                res.on("end", () => {
                    logOnlyIfRequired("Core Request " + log_options + " Responded At: " + (new Date() - startedAt) +" ms Core return Object : " + responseData, "WebServerGateway");
                    let response = responseData;
                /*if(res.headers["content-type"].search(/json/ig) != -1)*/ response = checkJSONResponse(response);
                    if(addHeaders) response["headers"] = res["headers"];
                    resolve(response);
                });
            });

            req.on("error", (e) => {
                logOnlyIfRequired("Core Request " + log_options + " Failed : " + JSON.stringify(e), "WebServerGateway");
                resolve(incorrectResponse);
            });

            if (write) req.write(requestBody);
            req.end();
        });
    }
})();