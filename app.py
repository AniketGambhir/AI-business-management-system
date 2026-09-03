from flask import Flask, render_template, request, jsonify
from database import get_connection

app = Flask(__name__)

# Tables allowed in our application
ALLOWED_TABLES = [
    "customer",
    "employee",
    "product",
    "inventory",
    "orders",
    "invoice",
    "project"
]


# =========================================================
# HOME PAGE
# =========================================================
@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# GET ALL TABLES
# =========================================================
@app.route("/api/tables")
def get_tables():
    return jsonify(ALLOWED_TABLES)


# =========================================================
# GET TABLE STRUCTURE + DATA
# =========================================================
@app.route("/api/table/<table_name>")
def get_table(table_name):

    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        # Get column information
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()

        # Get table data
        cursor.execute(f"SELECT * FROM `{table_name}`")
        data = cursor.fetchall()

        return jsonify({
            "table": table_name,
            "columns": columns,
            "data": data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# =========================================================
# INSERT DATA
# =========================================================
@app.route("/api/table/<table_name>/insert", methods=["POST"])
def insert_data(table_name):

    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    try:
        # Remove empty values
        clean_data = {
            key: value
            for key, value in data.items()
            if value != ""
        }

        columns = list(clean_data.keys())
        values = list(clean_data.values())

        column_names = ", ".join(f"`{column}`" for column in columns)
        placeholders = ", ".join(["%s"] * len(values))

        sql = f"""
            INSERT INTO `{table_name}`
            ({column_names})
            VALUES ({placeholders})
        """

        cursor.execute(sql, values)
        connection.commit()

        return jsonify({
            "success": True,
            "message": "Record inserted successfully"
        })

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# =========================================================
# UPDATE DATA
# =========================================================
@app.route("/api/table/<table_name>/update", methods=["PUT"])
def update_data(table_name):

    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    data = request.json

    primary_key = data.get("primary_key")
    primary_value = data.get("primary_value")
    changes = data.get("changes")

    if not primary_key or primary_value is None or not changes:
        return jsonify({"error": "Invalid update data"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    try:

        set_parts = []
        values = []

        for column, value in changes.items():

            if column == primary_key:
                continue

            set_parts.append(f"`{column}` = %s")
            values.append(value)

        values.append(primary_value)

        sql = f"""
            UPDATE `{table_name}`
            SET {", ".join(set_parts)}
            WHERE `{primary_key}` = %s
        """

        cursor.execute(sql, values)
        connection.commit()

        return jsonify({
            "success": True,
            "message": "Record updated successfully"
        })

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# =========================================================
# DELETE DATA
# =========================================================
@app.route("/api/table/<table_name>/delete", methods=["DELETE"])
def delete_data(table_name):

    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    data = request.json

    primary_key = data.get("primary_key")
    primary_value = data.get("primary_value")

    if not primary_key or primary_value is None:
        return jsonify({"error": "Invalid delete data"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    try:

        sql = f"""
            DELETE FROM `{table_name}`
            WHERE `{primary_key}` = %s
        """

        cursor.execute(sql, (primary_value,))
        connection.commit()

        return jsonify({
            "success": True,
            "message": "Record deleted successfully"
        })

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# =========================================================
# SEARCH
# =========================================================
@app.route("/api/table/<table_name>/search")
def search_data(table_name):

    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    search = request.args.get("q", "")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # Get columns
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()

        # Search all columns
        conditions = []
        values = []

        for column in columns:

            column_name = column["Field"]

            conditions.append(
                f"CAST(`{column_name}` AS CHAR) LIKE %s"
            )

            values.append(f"%{search}%")

        sql = f"""
            SELECT *
            FROM `{table_name}`
            WHERE {" OR ".join(conditions)}
        """

        cursor.execute(sql, values)

        data = cursor.fetchall()

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# =========================================================
# RUN APPLICATION
# =========================================================
if __name__ == "__main__":
    app.run(debug=True)
