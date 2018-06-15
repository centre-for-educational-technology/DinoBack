<?php header('charset=utf-8');
	session_start();
	require("db.php");
	require("deploy.php");

	function new_session() {
		$_SESSION["initialized"] = true;
		$_SESSION["user"] = [
			"username" => "",
			"password" => "",
			"display_name" => "guest",
			"is_guest" => true
		];
		$_SESSION["timeout"] = time() + 3600;
	}

	function continue_session() {
		if ($_SESSION["timeout"] < time()) return new_session();
	}

	if (isset($_SESSION["initialized"])) {
		continue_session();	
	} else {
		new_session();
	}

	$chunk_max_size = 524288;

	$ret = ["result" => "error_no_method"];
	if (isset($_GET["method"])) {
		$args = json_decode(file_get_contents("php://input"));
		switch($_GET["method"]) {
			case "login":
				$username = $args->username;
				$password = $args->password;
				$qr = $dbi->select("users", ["username" => $username]);
				if (count($qr) == 0) {
					$ret["result"] = "error_wrong_user_or_pass";
				} else {
					$user = $qr[0];
					if (password_verify($password, $user["pass_hash"])) {
						new_session();
						$ret["result"] = "success";
						$ret["display_name"] = $user["display_name"];
						$_SESSION["user"] = [
							"username" => $username,
							"password" => $password,
							"display_name" => $user["display_name"],
							"is_guest" => false
						];
					} else {
						$ret["result"] = "error_wrong_user_or_pass";
					}
				}
				break;
			case "check_login":
				if ($_SESSION["user"]["is_guest"]) {
					$ret["result"] = "error_guest";
					$ret["display_name"] = $_SESSION["user"]["display_name"];
				} else {
					$ret["result"] = "success";
					$ret["display_name"] = $_SESSION["user"]["display_name"];
				}	
				break;
			case "logout":
				new_session();
				$ret["result"] = "success";
				break;
			case "change_password":
				$old_password = $args->old_password;
				$new_password = $args->new_password;

				$qr = $dbi->select("users", ["username" => $_SESSION["user"]["username"]]);
				if (count($qr) == 0) { new_session(); die("you don't exist."); }
				$user = $qr[0];


				if (password_verify($old_password, $user["pass_hash"])) {
					$ret["result"] = "success";
					$user["pass_hash"] = password_hash($new_password, PASSWORD_BCRYPT);
					$_SESSION["user"]["password"] = $new_password;
					$dbi->update("users", $user);
				} else {
					$ret["result"] = "error_wrong_password";
				}
				break;
			case "save_data":
				$ref = "unknown";
				if (isset($_SERVER["HTTP_REFERER"])) $ref = $_SERVER["HTTP_REFERER"];

				$ins = [
					"JSON" => $args->JSON,
					"CSV" => $args->CSV,
					"date" => time(),
					"origin" => $ref,
					"endpoint" => $_SERVER["REMOTE_ADDR"]
				];
				$dbi->insert("data", $ins);
				$ret["result"] = "success";
				var_dump($ins);
				break;
			case "get_data":
				if ($_SESSION["user"]["is_guest"]) die("nope");

				$qr = $dbi->select("data", NULL, ["id", "date", "origin", "endpoint"]);
				$ret["result"] = "success";
				$ret["data"] = $qr;
				break;
			case "download_JSON":
				if ($_SESSION["user"]["is_guest"]) die("nope");

				$qr = $dbi->select("data", NULL, ["id", "JSON"]);

				//	make chunks
				$chunks = [];
				$current_chunk = [];
				$current_chunk_size = 0;
				for ($i = 0; $i < count($qr); $i++) {
					$item = $qr[$i];
					$data = $item["JSON"];
					$data_len = mb_strlen($data);
					if ($data_len > $chunk_max_size) die("single item exceeding chunk limit");

					if (in_array($item["id"], $args)) {
						if ($current_chunk_size + $data_len > $chunk_max_size) {
							$chunks []= $current_chunk;
							$current_chunk = [];
							$current_chunk_size = 0;
						} else {
							$current_chunk []= $data;
							$current_chunk_size += $data_len;
						}
					}
				}
				$chunks []= $current_chunk;

				//	prep chunks
				$_SESSION["chunk_cache"] = $chunks;
				$_SESSION["chunk_idx"] = 0;

				//	send
				$ret["data"] = $_SESSION["chunk_cache"][$_SESSION["chunk_idx"]++];
				if ($_SESSION["chunk_idx"] == count($_SESSION["chunk_cache"])) $ret["result"] = "success"; else $ret["result"] = "multi_chunk_start";

				break;
			case "download_CSV":
				if ($_SESSION["user"]["is_guest"]) die("nope");

				$qr = $dbi->select("data", NULL, ["id", "CSV"]);

				//	make chunks
				$chunks = [];
				$current_chunk = [];
				$current_chunk_size = 0;
				for ($i = 0; $i < count($qr); $i++) {
					$item = $qr[$i];
					$data = $item["CSV"];
					$data_len = mb_strlen($data);
					if ($data_len > $chunk_max_size) die("single item exceeding chunk limit");

					if (in_array($item["id"], $args)) {
						if ($current_chunk_size + $data_len > $chunk_max_size) {
							$chunks []= $current_chunk;
							$current_chunk = [];
							$current_chunk_size = 0;
						} else {
							$current_chunk []= $data;
							$current_chunk_size += $data_len;
						}
					}
				}
				$chunks []= $current_chunk;

				//	prep chunks
				$_SESSION["chunk_cache"] = $chunks;
				$_SESSION["chunk_idx"] = 0;

				//	send
				$ret["data"] = $_SESSION["chunk_cache"][$_SESSION["chunk_idx"]++];
				if ($_SESSION["chunk_idx"] == count($_SESSION["chunk_cache"])) $ret["result"] = "success"; else $ret["result"] = "multi_chunk_start";

				break;
			case "continue":
				if ($_SESSION["user"]["is_guest"]) die("nope");

				if (!array_key_exists("chunk_cache", $_SESSION)) die("chunk cache doesn't exist");
				if ($_SESSION["chunk_idx"] == count($_SESSION["chunk_cache"])) die("chunk cache exhausted");

				$ret["data"] = $_SESSION["chunk_cache"][$_SESSION["chunk_idx"]++];
				if ($_SESSION["chunk_idx"] == count($_SESSION["chunk_cache"])) $ret["result"] = "multi_chunk_success"; else $ret["result"] = "multi_chunk_continued";

				break;
		}
	}
	echo json_encode($ret);


?>