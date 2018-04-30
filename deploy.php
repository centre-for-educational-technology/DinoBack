<?php header('charset=utf-8');
	function deploy_if_not_deployed() {
		global $dbi;
		if ($dbi->table_exists("users")) return;

		$dbi->query("CREATE TABLE users (
			id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
			username VARCHAR(".db_settings_uKeyLen.") UNIQUE,
			display_name VARCHAR(".db_settings_uKeyLen."),
			pass_hash CHAR(60)
		)");

		$admin_user = ["username" => "admin", "pass_hash" => password_hash("1234", PASSWORD_BCRYPT), "display_name" => "Admin"];
		$dbi->insert("users", $admin_user);


		$dbi->query("CREATE TABLE data (
			id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
			date INT,
			CSV TEXT,
			JSON TEXT,
			origin VARCHAR(255),
			endpoint VARCHAR(255)
		)");

	}
	deploy_if_not_deployed();
?>