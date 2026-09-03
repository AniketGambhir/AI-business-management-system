import mysql.connector


def get_connection():

    connection = mysql.connector.connect(

        host="localhost",

        user="root",

        password="Aniket$2007",

        database="ai_business_management_system"

    )

    return connection
