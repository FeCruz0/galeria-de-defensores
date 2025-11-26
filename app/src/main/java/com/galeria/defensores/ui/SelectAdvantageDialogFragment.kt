package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.data.AdvantagesRepository
import com.galeria.defensores.models.AdvantageItem

class SelectAdvantageDialogFragment(
    private val onAdvantageSelected: (AdvantageItem) -> Unit
) : DialogFragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NORMAL, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_select_advantage, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val recyclerView = view.findViewById<RecyclerView>(R.id.recycler_advantages)
        recyclerView.layoutManager = LinearLayoutManager(context)
        
        fun loadAdvantages() {
            val adapter = AdvantagesAdapter(
                items = AdvantagesRepository.getAllAdvantages(),
                onDeleteClick = { itemToDelete ->
                    AdvantagesRepository.removeAdvantage(itemToDelete)
                    loadAdvantages()
                },
                onItemClick = { selectedItem ->
                    onAdvantageSelected(selectedItem)
                    dismiss()
                }
            )
            recyclerView.adapter = adapter
        }
        
        loadAdvantages()

        view.findViewById<View>(R.id.btn_cancel_selection).setOnClickListener {
            dismiss()
        }
        
        view.findViewById<View>(R.id.btn_new_advantage).setOnClickListener {
            val editDialog = EditAdvantageDialogFragment(null, { newAdvantage ->
                AdvantagesRepository.addAdvantage(newAdvantage)
                loadAdvantages() // Refresh list
            })
            editDialog.show(parentFragmentManager, "EditAdvantageDialog")
        }
    }
}
