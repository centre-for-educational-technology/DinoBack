<?php header('charset=utf-8');

	require("config.php");
	
	//	mysqli wrapper for convenience
	class dbi {
		//	the interface
		public $mysqli;
		public $db_connected = NULL;
		public $db_exists = NULL;
		public $db_selected = NULL;
		
		//	optional result arg
		public $arg;
		public $arg2;

		public function err($msg) { 
			echo $msg;
			return false;
		}
		
		//	boiler
		
		public function __construct() {
			if (!$this->connect_db()) { return $this->err("Unable to log into SQL database."); }
			if (!$this->create_db()) { return $this->err("Unable to create SQL database."); }
			if (!$this->select_db()) { return $this->err("Unable to select SQL database."); }			
		}

		public function connect_db() {
			set_error_handler(function($err_n, $err_str) { $this->db_connected = false; });		
			$this->mysqli = new mysqli(db_settings_host, db_settings_user, db_settings_password, NULL, db_settings_port);		
			restore_error_handler();
			if ($this->db_connected !== false) $this->db_connected = true;
			return $this->db_connected;
		}
		
		public function create_db() {
			return $this->db_exists = $this->mysqli->query("CREATE DATABASE IF NOT EXISTS " . db_settings_name . " CHARACTER SET " . db_settings_charset . " COLLATE " . db_settings_collate);
		}	

		public function select_db() {
			if ($this->db_selected == true) return true;
			return $this->db_selected = $this->mysqli->select_db(db_settings_name);	
		}	

		public function query($sql) {
			return $this->mysqli->query($sql);
		}	

		public function escape($value) {
			return $this->mysqli->real_escape_string($value);
		}

		public function table_exists($name) {
			$sql = "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '" . db_settings_name . "' AND  TABLE_NAME = '" . $name . "'";
			$selector = $this->query($sql);
			return $selector->num_rows >= 1;
		}

		//	plain where string (unsafe, not properly escaped)
		//	"key" => "value" 
		//	"key" => ["operator", "value"]
		public function where($where) {
			if (is_string($where)) return $where;
			if (is_array($where)) {
				$sql = " WHERE ";
				foreach ($where as $key => $value) {
					if (is_array($value)) {
						$sql .= $this->escape($key) . $this->escape($value[0]) . "'" . $this->escape($value[1]) . "',";
					} else {
						$sql .= $this->escape($key) . "='" . $this->escape($value) . "',";
					}	
				}
				$sql = rtrim($sql, ",");
				return $sql;
			}
			return "";
		}
		
		//basic interaction
		public function insert($table, &$obj) {
			$sql1 = "INSERT INTO " . $this->escape($table) . " (";
			$sql2 = "VALUES (";
			foreach ($obj as $key => $value) {
				$sql1 .= $key . ",";
				$sql2 .= "'" . $this->escape($value) . "',";
			}
			$sql = rtrim($sql1, ",") . ") " . rtrim($sql2, ",") . ")";
			
			if ($this->query($sql)) {
				$obj["id"] = $this->mysqli->insert_id;
				return true;
			}
			
			return false;
		}
		
		public function delete($table, $where) {
			$sql = "DELETE FROM " . $this->escape($table) . $this->where($where);
			return $this->query($sql);
		}
		
		public function delete_by_id($table, $id) {
			return $this->delete($table, $this->where(["id" => $id]));
		}
		
		public function select($table, $where = NULL, $columns = NULL) {
			$sql = "SELECT ";

			if (isset($columns) && is_array($columns)) {
				for ($i = 0; $i < count($columns); $i++) {
					$sql .= $this->escape($columns[$i]) . ",";
				}
				$sql = rtrim($sql, ",");
			} else {
				$sql .= "*";
			}
			$sql .= " FROM " . $this->escape($table);		
			if (isset($where)) $sql .= $this->where($where);

			$selector = $this->query($sql);
			if (!$selector) return false;
			
			$ret = [];
			while ($row = $selector->fetch_assoc()) array_push($ret, $row);
			return $ret;
		}

		public function update($table, $obj) {
			$sql = "UPDATE " . $this->escape($table) . " SET ";
			foreach ($obj as $key => $value) {
				if ($key == "id") continue;
				$sql .= $key . "='" . $this->escape($value) . "',";
			}
			$sql = rtrim($sql, ",") . " WHERE id=" . $this->escape($obj["id"]);
			return $this->query($sql);
		}
	}

	$dbi = new dbi();
?>