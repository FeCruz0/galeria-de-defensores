package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.galeria.defensores.R
import com.galeria.defensores.ui.TableListFragment
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.data.UserRepository
import com.galeria.defensores.models.User
import kotlinx.coroutines.launch
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
        val progressBar = view.findViewById<ProgressBar>(R.id.login_progress)
        val debugLogView = view.findViewById<android.widget.TextView>(R.id.debug_log)

        fun logToScreen(message: String) {
            android.util.Log.d("LoginFragment", message)
            debugLogView.append("$message\n")
            // Auto-scroll to bottom
            val scrollView = debugLogView.parent as? android.widget.ScrollView
            scrollView?.post { scrollView.fullScroll(View.FOCUS_DOWN) }
        }

        loginButton.setOnClickListener {
            val name = nameInput.text.toString().trim()
            val phone = phoneInput.text.toString().trim()

            if (name.isBlank() || phone.isBlank()) {
                logToScreen("Erro: Campos vazios.")
                Toast.makeText(context, "Preencha todos os campos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Show loading UI
            progressBar.visibility = View.VISIBLE
            loginButton.isEnabled = false
            nameInput.isEnabled = false
            phoneInput.isEnabled = false
            logToScreen("Iniciando login para: $phone")

            lifecycleScope.launch {
                try {
                    logToScreen("Buscando usuário no Firestore...")
                    var user = UserRepository.findUserByPhone(phone)
                    if (user == null) {
                        logToScreen("Usuário não encontrado. Criando novo...")
                        user = User(id = UUID.randomUUID().toString(), name = name, phoneNumber = phone)
                        UserRepository.registerUser(user)
                        logToScreen("Usuário registrado com sucesso.")
                    } else {
                        logToScreen("Usuário encontrado: ${user.name}")
                    }
                    
                    // Save session locally
                    SessionManager.login(user)
                    logToScreen("Sessão salva. Navegando...")
                    
                    // Navigate to Table List
                    parentFragmentManager.beginTransaction()
                        .replace(R.id.fragment_container, TableListFragment())
                        .commit()
                } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                    logToScreen("Erro: Timeout (60s). Verifique internet.")
                    android.util.Log.e("LoginFragment", "Login timed out", e)
                    Toast.makeText(context, "Tempo esgotado (60s). Verifique sua conexão.", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    logToScreen("Erro: ${e.message}")
                    android.util.Log.e("LoginFragment", "Login error", e)
                    Toast.makeText(context, "Erro: ${e.message}", Toast.LENGTH_LONG).show()
                } finally {
                    // Reset UI state
                    progressBar.visibility = View.GONE
                    loginButton.isEnabled = true
                    nameInput.isEnabled = true
                    phoneInput.isEnabled = true
                }
            }
        }
    }
}
