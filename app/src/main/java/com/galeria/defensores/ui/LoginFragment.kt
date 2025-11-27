package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.galeria.defensores.R
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.data.UserRepository
import com.galeria.defensores.models.User
import java.util.UUID

class LoginFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_login, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val nameInput = view.findViewById<EditText>(R.id.input_name)
        val phoneInput = view.findViewById<EditText>(R.id.input_phone)
        val loginButton = view.findViewById<Button>(R.id.btn_login)

        loginButton.setOnClickListener {
            val name = nameInput.text.toString()
            val phone = phoneInput.text.toString()

            if (name.isNotBlank() && phone.isNotBlank()) {
                // Check if user exists, else register
                var user = UserRepository.findUserByPhone(phone)
                if (user == null) {
                    user = User(id = UUID.randomUUID().toString(), name = name, phoneNumber = phone)
                    UserRepository.registerUser(user)
                }
                
                SessionManager.login(user)
                
                // Navigate to Table List
                parentFragmentManager.beginTransaction()
                    .replace(R.id.fragment_container, TableListFragment())
                    .commit()
            } else {
                Toast.makeText(context, "Preencha todos os campos", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
