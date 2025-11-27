package com.galeria.defensores.data

import com.galeria.defensores.models.User

object UserRepository {
    private val users = mutableListOf<User>()

    init {
        // Add some mock users
        users.add(User(name = "Mestre Supremo", phoneNumber = "123456789"))
        users.add(User(name = "Jogador 1", phoneNumber = "987654321"))
    }

    fun findUserByPhone(phone: String): User? {
        return users.find { it.phoneNumber == phone }
    }

    fun registerUser(user: User) {
        if (findUserByPhone(user.phoneNumber) == null) {
            users.add(user)
        }
    }
    
    fun getUser(id: String): User? {
        return users.find { it.id == id }
    }
}
