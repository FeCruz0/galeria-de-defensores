package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import com.galeria.defensores.R
import com.galeria.defensores.models.AdvantageItem
import com.google.android.material.textfield.TextInputEditText

class EditAdvantageDialogFragment(
    private val advantage: AdvantageItem?,
    private val onSave: (AdvantageItem) -> Unit,
    private val onDelete: ((AdvantageItem) -> Unit)? = null
) : DialogFragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NORMAL, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_edit_advantage, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val editName = view.findViewById<TextInputEditText>(R.id.edit_advantage_name)
        val editCost = view.findViewById<TextInputEditText>(R.id.edit_advantage_cost)
        val editDesc = view.findViewById<TextInputEditText>(R.id.edit_advantage_description)
        val btnRemove = view.findViewById<Button>(R.id.btn_remove)
        val titleView = view.findViewById<TextView>(R.id.dialog_title)

        if (advantage != null) {
            editName.setText(advantage.name)
            editCost.setText(advantage.cost)
            editDesc.setText(advantage.description)
            titleView.text = "Editar Vantagem"
        } else {
            titleView.text = "Nova Vantagem"
            btnRemove.visibility = View.GONE
        }

        if (onDelete == null) {
            btnRemove.visibility = View.GONE
        }

        btnRemove.setOnClickListener {
            if (advantage != null) {
                onDelete?.invoke(advantage)
                dismiss()
            }
        }

        view.findViewById<View>(R.id.btn_cancel).setOnClickListener {
            dismiss()
        }

        view.findViewById<View>(R.id.btn_save).setOnClickListener {
            val name = editName.text.toString()
            val cost = editCost.text.toString()
            val desc = editDesc.text.toString()

            if (name.isNotBlank()) {
                val newItem = advantage?.copy(
                    name = name,
                    cost = cost,
                    description = desc
                ) ?: AdvantageItem(
                    id = java.util.UUID.randomUUID().toString(),
                    name = name,
                    cost = cost,
                    description = desc
                )
                onSave(newItem)
                dismiss()
            }
        }
    }
}
