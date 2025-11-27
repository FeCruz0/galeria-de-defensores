package com.galeria.defensores

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.ui.LoginFragment
import com.galeria.defensores.ui.TableListFragment

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        SessionManager.init(this)

        if (savedInstanceState == null) {
            val startFragment = if (SessionManager.isLoggedIn()) {
                TableListFragment()
            } else {
                LoginFragment()
            }
            
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, startFragment)
                .commit()
        }
    }
}