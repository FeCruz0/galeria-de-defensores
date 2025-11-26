package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.data.DisadvantagesRepository
import com.galeria.defensores.models.AdvantageItem

class SelectDisadvantageDialogFragment(
    private val onDisadvantageSelected: (AdvantageItem) -> Unit
) : DialogFragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NORMAL, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_select_disadvantage, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val titleView = view.findViewById<TextView>(R.id.dialog_title)
        titleView.text = "Selecionar Desvantagem"

        val btnNew = view.findViewById<Button>(R.id.btn_new_disadvantage)
        btnNew.text = "Criar Nova Desvantagem"

        val recyclerView = view.findViewById<RecyclerView>(R.id.recycler_disadvantages)
        recyclerView.layoutManager = LinearLayoutManager(context)
        
        fun loadDisadvantages() {
            val adapter = AdvantagesAdapter(
                items = DisadvantagesRepository.getAllDisadvantages(),
                onDeleteClick = { itemToDelete ->
                    DisadvantagesRepository.removeDisadvantage(itemToDelete)
                    loadDisadvantages()
                },
                onItemClick = { selectedItem ->
                    onDisadvantageSelected(selectedItem)
                    dismiss()
                }
            )
            recyclerView.adapter = adapter
        }
        
        loadDisadvantages()

        view.findViewById<Button>(R.id.btn_cancel_selection).setOnClickListener {
            dismiss()
        }
        
        btnNew.setOnClickListener {
            val editDialog = EditAdvantageDialogFragment(
                advantage = null,
                onSave = { newDisadvantage ->
                    DisadvantagesRepository.addDisadvantage(newDisadvantage)
                    loadDisadvantages()
                }
            )
            editDialog.show(parentFragmentManager, "EditDisadvantageDialog")
        }
    }
}
