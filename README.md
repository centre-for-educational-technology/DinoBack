# DinoBack

General purpose data storage for jsPsych based web applications. After uploading to your server, fill out config.php and it is ready to go.

Requirements: PHP 5.6+, MySQL 5.0+


To send data to the storage, add this line to jsPsych's "onFinish" callback:  
$.post( DinoBack_URL + "/ajax.php?method=save_data", JSON.stringify({"JSON" : jsPsych.data.dataAsJSON(), "CSV" : jsPsych.data.dataAsCSV()}) );


To retrieve data, log in to admin.html page.  
Default username: "admin"  
Default password: "1234"

