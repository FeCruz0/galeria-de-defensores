package com.galeria.defensores.data

import android.content.Context
import android.content.SharedPreferences
import com.galeria.defensores.models.User

object SessionManager {
    private const val PREF_NAME = "user_session"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_USER_PHONE = "user_phone"

    private lateinit var preferences: SharedPreferences
    var currentUser: User? = null
        private set

    fun init(context: Context) {
        preferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val id = preferences.getString(KEY_USER_ID, null)
        val name = preferences.getString(KEY_USER_NAME, null)
        val phone = preferences.getString(KEY_USER_PHONE, null)

        if (id != null && name != null && phone != null) {
            currentUser = User(id, name, phone)
            // Ensure user exists in repository (sync)
            UserRepository.registerUser(currentUser!!)
        }
    }

    fun login(user: User) {
        currentUser = user
        preferences.edit()
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_NAME, user.name)
            .putString(KEY_USER_PHONE, user.phoneNumber)
            .apply()
        UserRepository.registerUser(user)
    }

    fun logout() {
        currentUser = null
        preferences.edit().clear().apply()
    }
    
    fun isLoggedIn(): Boolean = currentUser != null
}
