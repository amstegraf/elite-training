package com.elitetraining.mobile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class MainActivity : ComponentActivity() {
    private val requestCameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
        val deeplinkPayload = intent?.dataString?.let { ConnectionInfo.fromRawScan(it) }
        setContent {
            MaterialTheme {
                MobileApp(deeplinkPayload = deeplinkPayload)
            }
        }
    }
}

@Composable
private fun MobileApp(deeplinkPayload: ConnectionInfo?) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("elite_mobile", Context.MODE_PRIVATE) }
    var connection by remember {
        mutableStateOf(
            deeplinkPayload ?: ConnectionInfo.load(prefs)
        )
    }
    var status by remember { mutableStateOf("Connect to a live session.") }

    if (connection == null) {
        ScannerScreen(
            onConnected = {
                connection = it
                it.save(prefs)
                status = "Connected to ${it.sessionId}."
            },
            status = status
        )
    } else {
        MissControlScreen(
            connection = connection!!,
            onDisconnect = {
                connection = null
                ConnectionInfo.clear(prefs)
                status = "Connection cleared."
            }
        )
    }
}

@Composable
private fun ScannerScreen(onConnected: (ConnectionInfo) -> Unit, status: String) {
    var manual by remember { mutableStateOf("") }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Scan Session QR", style = MaterialTheme.typography.headlineSmall)
        Text(status, style = MaterialTheme.typography.bodyMedium)
        ElevatedCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("Point camera at the QR shown in the desktop live session.")
                Spacer(modifier = Modifier.height(8.dp))
                CameraScanView(onDetected = { raw ->
                    ConnectionInfo.fromRawScan(raw)?.let(onConnected)
                })
            }
        }
        Text("Or paste connect URL manually:")
        OutlinedTextField(value = manual, onValueChange = { manual = it }, modifier = Modifier.fillMaxWidth())
        Button(onClick = {
            ConnectionInfo.fromRawScan(manual)?.let(onConnected)
        }) {
            Text("Connect")
        }
    }
}

@Composable
private fun MissControlScreen(connection: ConnectionInfo, onDisconnect: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var ball by remember { mutableStateOf(1) }
    var types by remember { mutableStateOf(setOf<String>()) }
    var outcome by remember { mutableStateOf("playable") }
    var isSending by remember { mutableStateOf(false) }
    var liveState by remember { mutableStateOf<ApiClient.LiveState?>(null) }
    var currentDurationSeconds by remember { mutableStateOf(0) }
    var isPaused by remember { mutableStateOf(false) }
    var showUndoConfirm by remember { mutableStateOf(false) }

    val panelBg = Color(0xFFF2F4F7)
    val cardBg = Color(0xFFE6E9EF)
    val sectionTitle = Color(0xFF94A3B8)
    val primaryText = Color(0xFF1E293B)
    val actionOrange = Color(0xFFFF694B)
    val mutedBall = Color(0xFFB9C0CC)

    fun pickNextBall(state: ApiClient.LiveState?): Int {
        if (state == null) return 1
        val suggested = state.suggestedNextBall
        if (suggested != null && suggested in 1..9 && !state.playedBallNumbers.contains(suggested)) {
            return suggested
        }
        return (1..9).firstOrNull { !state.playedBallNumbers.contains(it) } ?: 1
    }

    fun applyLiveState(state: ApiClient.LiveState) {
        liveState = state
        currentDurationSeconds = state.effectiveDuration
        isPaused = state.isPaused
        ball = pickNextBall(state)
    }

    fun refreshLive() {
        scope.launch {
            val result = ApiClient.fetchLiveState(connection)
            if (!result.ok || result.state == null) {
                Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                return@launch
            }
            applyLiveState(result.state)
        }
    }

    LaunchedEffect(connection.sessionId) {
        refreshLive()
    }
    LaunchedEffect(isPaused) {
        while (!isPaused) {
            delay(1000)
            currentDurationSeconds += 1
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(panelBg)
            .padding(14.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF1E2B45))
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Column {
                Text("Log miss", color = Color.White, style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Track what went wrong",
                    color = Color(0xFFB8C4D9),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Text(
            "Connected to session ${connection.sessionId}",
            style = MaterialTheme.typography.bodySmall,
            color = sectionTitle
        )
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                formatDuration(currentDurationSeconds),
                style = MaterialTheme.typography.headlineLarge,
                color = primaryText
            )
            Button(
                onClick = {
                scope.launch {
                    val next = !isPaused
                    val result = ApiClient.togglePause(connection, next)
                    if (!result.ok) {
                        Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                    } else {
                        isPaused = next
                        Toast.makeText(
                            context,
                            if (next) "Timer paused" else "Timer resumed",
                            Toast.LENGTH_SHORT
                        ).show()
                        refreshLive()
                    }
                }
            },
                shape = RoundedCornerShape(999.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFECEFF4),
                    contentColor = primaryText
                ),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 18.dp, vertical = 8.dp)
            ) {
                Text(
                    if (isPaused) "▷ Resume timing" else "❚❚ Pause timing",
                    color = primaryText,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { refreshLive() },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE3E8F1),
                    contentColor = primaryText
                )
            ) { Text("Refresh") }
            Button(
                onClick = onDisconnect,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE3E8F1),
                    contentColor = primaryText
                )
            ) { Text("Disconnect") }
        }

        Text(
            "BALL MISSED",
            style = MaterialTheme.typography.labelLarge,
            color = sectionTitle,
            fontWeight = FontWeight.Bold
        )
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf((1..6).toList(), (7..9).toList()).forEach { rowVals ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    rowVals.forEach { n ->
                        val played = liveState?.playedBallNumbers?.contains(n) == true
                        BallChip(
                            number = n,
                            selected = ball == n,
                            muted = played,
                            mutedColor = mutedBall,
                            onClick = { if (!played) ball = n }
                        )
                    }
                }
            }
        }

        Text(
            "WHAT WENT WRONG",
            style = MaterialTheme.typography.labelLarge,
            color = sectionTitle,
            fontWeight = FontWeight.Bold
        )
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf(
                listOf("position", "alignment"),
                listOf("delivery", "speed")
            ).forEach { rowItems ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    rowItems.forEach { t ->
                        ReasonCard(
                            key = t,
                            selected = types.contains(t),
                            bg = cardBg,
                            onToggle = { checked ->
                                types = if (checked) types + t else types - t
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        Text(
            "OUTCOME",
            style = MaterialTheme.typography.labelLarge,
            color = sectionTitle,
            fontWeight = FontWeight.Bold
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("playable", "pot_miss", "no_shot_position").forEach { o ->
                OutcomeCard(
                    key = o,
                    selected = outcome == o,
                    bg = cardBg,
                    modifier = Modifier.weight(1f),
                    onClick = { outcome = o }
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                enabled = !isSending,
                onClick = {
                    if (isSending) return@Button
                    scope.launch {
                        val state = liveState
                        val rackId = state?.currentRackId
                        isSending = true
                        if (rackId.isNullOrBlank()) {
                            val result = ApiClient.startRack(connection)
                            if (result.ok) {
                                Toast.makeText(context, "Rack started", Toast.LENGTH_SHORT).show()
                                val live = ApiClient.fetchLiveState(connection)
                                if (live.ok && live.state != null) applyLiveState(live.state)
                            } else {
                                Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                            }
                        } else {
                            val result = ApiClient.endRack(connection, rackId)
                            if (result.ok) {
                                Toast.makeText(context, "Rack ended", Toast.LENGTH_SHORT).show()
                                val live = ApiClient.fetchLiveState(connection)
                                if (live.ok && live.state != null) applyLiveState(live.state)
                            } else {
                                Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                            }
                        }
                        isSending = false
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE3E8F1),
                    contentColor = primaryText
                ),
                modifier = Modifier.width(120.dp)
            ) {
                Text(
                    if (liveState?.currentRackId.isNullOrBlank()) "Start rack" else "End rack",
                    color = primaryText,
                    fontWeight = FontWeight.Bold
                )
            }
            Button(
                onClick = {
                if (isSending) return@Button
                scope.launch {
                    val selectedBall = ball
                    val latest = ApiClient.fetchLiveState(connection)
                    if (!latest.ok || latest.state == null) {
                        Toast.makeText(context, latest.message, Toast.LENGTH_LONG).show()
                        return@launch
                    }
                    liveState = latest.state
                    currentDurationSeconds = latest.state.effectiveDuration
                    isPaused = latest.state.isPaused
                    val rackId = latest.state.currentRackId
                    if (rackId.isNullOrBlank()) {
                        Toast.makeText(context, "No open rack. Tap Start rack first.", Toast.LENGTH_LONG).show()
                        return@launch
                    }
                    isSending = true
                    val result = ApiClient.submitMiss(
                        connection = connection,
                        rackId = rackId,
                        ball = selectedBall,
                        types = types.toList(),
                        outcome = outcome
                    )
                    if (result.ok) {
                        Toast.makeText(context, "Miss logged", Toast.LENGTH_SHORT).show()
                        types = emptySet()
                        outcome = "playable"
                        val live = ApiClient.fetchLiveState(connection)
                        if (live.ok && live.state != null) {
                            applyLiveState(live.state)
                        }
                    } else {
                        Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                    }
                    isSending = false
                }
            },
                enabled = !isSending,
                colors = ButtonDefaults.buttonColors(
                    containerColor = actionOrange,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .height(50.dp)
                    .width(150.dp)
            ) {
                Text(if (isSending) "Saving..." else "Save miss", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        if ((liveState?.recentMisses?.isNotEmpty() == true)) {
            Text(
                "LATEST MISSES",
                style = MaterialTheme.typography.labelLarge,
                color = sectionTitle,
                fontWeight = FontWeight.Bold
            )
            val items = liveState?.recentMisses?.take(12).orEmpty()
            items.forEachIndexed { idx, miss ->
                if (idx > 0 && items[idx - 1].rackNumber != miss.rackNumber) {
                    Text(
                        "— Rack ${miss.rackNumber} —",
                        style = MaterialTheme.typography.bodySmall,
                        color = sectionTitle,
                        modifier = Modifier.padding(top = 2.dp, bottom = 2.dp)
                    )
                }
                LatestMissItem(
                    miss = miss,
                    bg = cardBg,
                    textColor = primaryText,
                    showUndo = idx == 0,
                    onUndo = {
                        if (!isSending) showUndoConfirm = true
                    }
                )
            }
        }
    }

    if (showUndoConfirm) {
        AlertDialog(
            onDismissRequest = { showUndoConfirm = false },
            title = { Text("Undo miss") },
            text = { Text("Undo the most recent miss?") },
            dismissButton = {
                TextButton(onClick = { showUndoConfirm = false }) {
                    Text("Cancel")
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showUndoConfirm = false
                        if (isSending) return@TextButton
                        scope.launch {
                            isSending = true
                            val result = ApiClient.undoLastMiss(connection)
                            if (result.ok) {
                                Toast.makeText(context, "Miss undone", Toast.LENGTH_SHORT).show()
                                val live = ApiClient.fetchLiveState(connection)
                                if (live.ok && live.state != null) {
                                    applyLiveState(live.state)
                                }
                            } else {
                                Toast.makeText(context, result.message, Toast.LENGTH_LONG).show()
                            }
                            isSending = false
                        }
                    }
                ) {
                    Text("Undo")
                }
            }
        )
    }
}

@Composable
private fun BallChip(
    number: Int,
    selected: Boolean,
    muted: Boolean,
    mutedColor: Color,
    onClick: () -> Unit
) {
    val bg = when (number) {
        1 -> Color(0xFFF6D32D)
        2 -> Color(0xFF3584E4)
        3 -> Color(0xFFED333B)
        4 -> Color(0xFF9141AC)
        5 -> Color(0xFFFF7800)
        6 -> Color(0xFF33D17A)
        7 -> Color(0xFF8F5C38)
        8 -> Color(0xFF242424)
        9 -> Color(0xFFFFFFFF) // striped 9: white + yellow band (desktop rack-ball--n9)
        else -> Color(0xFFF6D32D)
    }
    val finalBg = if (muted) mutedColor else bg
    val text = if (number == 1 || number == 9 || muted) Color(0xFF1F2937) else Color.White
    val edge = when {
        selected -> Color(0xFFFF694B)
        !muted && number == 9 -> Color(0xFFD0D7E2) // keep white 9 visible on light panel
        else -> Color.Transparent
    }
    val edgeW = when {
        selected -> 3.dp
        !muted && number == 9 -> 1.dp
        else -> 0.dp
    }
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(finalBg)
            .border(width = edgeW, color = edge, shape = CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (!muted && number == 9) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.44f)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color(0xFFFACC15)) // #facc15 band like desktop
            )
        }
        Text(number.toString(), color = text, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ReasonCard(
    key: String,
    selected: Boolean,
    bg: Color,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val title = when (key) {
        "position" -> "Position"
        "alignment" -> "Alignment"
        "delivery" -> "Delivery"
        else -> "Speed"
    }
    val subtitle = when (key) {
        "position" -> "Cue ball placement"
        "alignment" -> "Aim was off"
        "delivery" -> "Stroke issue"
        else -> "Too hard or soft"
    }
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) Color(0xFFDCE9FF) else bg)
            .border(
                width = if (selected) 2.dp else 0.dp,
                color = if (selected) Color(0xFFFF694B) else Color.Transparent,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable { onToggle(!selected) }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(checked = selected, onCheckedChange = { onToggle(it) })
        Column {
            Text(title, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF7E8CA5))
        }
    }
}

@Composable
private fun OutcomeCard(
    key: String,
    selected: Boolean,
    bg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val label = when (key) {
        "playable" -> "Playable"
        "pot_miss" -> "Pot miss"
        else -> "No shot"
    }
    val symbol = when (key) {
        "playable" -> "✓"
        "pot_miss" -> "✕"
        else -> "⊘"
    }
    Row(
        modifier = modifier
            .height(86.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) Color(0xFFFBE6E2) else bg)
            .border(
                width = if (selected) 2.dp else 0.dp,
                color = if (selected) Color(0xFFFF694B) else Color.Transparent,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(symbol, style = MaterialTheme.typography.headlineSmall, color = Color(0xFF1E293B))
            Text(label, color = Color(0xFF1E293B), fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun LatestMissItem(
    miss: ApiClient.LiveMiss,
    bg: Color,
    textColor: Color,
    showUndo: Boolean,
    onUndo: () -> Unit
) {
    val outcomeLabel = miss.outcome.replace('_', ' ')
    val typesLabel = if (miss.types.isEmpty()) "No tags" else miss.types.joinToString(", ")
    Box(
        modifier = Modifier
            .fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(bg)
                .padding(horizontal = 10.dp, vertical = 8.dp)
                .padding(end = if (showUndo) 40.dp else 0.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            MiniBall(number = miss.ballNumber)
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    "Rack ${miss.rackNumber} · ${outcomeLabel.replaceFirstChar { it.uppercase() }}",
                    style = MaterialTheme.typography.bodySmall,
                    color = textColor,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    typesLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF7E8CA5)
                )
            }
        }
        if (showUndo) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 10.dp)
                    .size(24.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFFF694B))
                    .clickable(onClick = onUndo),
                contentAlignment = Alignment.Center
            ) {
                Text("↺", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun MiniBall(number: Int) {
    val bg = when (number) {
        1 -> Color(0xFFF6D32D)
        2 -> Color(0xFF3584E4)
        3 -> Color(0xFFED333B)
        4 -> Color(0xFF9141AC)
        5 -> Color(0xFFFF7800)
        6 -> Color(0xFF33D17A)
        7 -> Color(0xFF8F5C38)
        8 -> Color(0xFF242424)
        9 -> Color(0xFFFFFFFF)
        else -> Color(0xFFF6D32D)
    }
    val text = if (number == 1 || number == 9) Color(0xFF1F2937) else Color.White
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(CircleShape)
            .background(bg)
            .then(
                if (number == 9) {
                    Modifier.border(1.dp, Color(0xFFD0D7E2), CircleShape)
                } else {
                    Modifier
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        if (number == 9) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.46f)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color(0xFFFACC15))
            )
        }
        Text(number.toString(), color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun CameraScanView(onDetected: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    var consumed by remember { mutableStateOf(false) }
    val scanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        )
    }

    AndroidView(
        modifier = Modifier
            .fillMaxWidth()
            .height(320.dp),
        factory = {
            val previewView = PreviewView(it)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(it)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also { p ->
                    p.setSurfaceProvider(previewView.surfaceProvider)
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                val executor = Executors.newSingleThreadExecutor()
                analysis.setAnalyzer(executor) { imageProxy ->
                    val mediaImage = imageProxy.image
                    if (mediaImage == null || consumed) {
                        imageProxy.close()
                        return@setAnalyzer
                    }
                    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                    scanner.process(image)
                        .addOnSuccessListener { barcodes ->
                            val value = barcodes.firstOrNull()?.rawValue
                            if (!value.isNullOrBlank() && !consumed) {
                                consumed = true
                                onDetected(value)
                            }
                        }
                        .addOnCompleteListener { imageProxy.close() }
                }
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
            }, ContextCompat.getMainExecutor(context))
            previewView
        }
    )
}

private data class ConnectionInfo(
    val baseUrl: String,
    val sessionId: String,
    val token: String
) {
    fun save(prefs: android.content.SharedPreferences) {
        prefs.edit()
            .putString("base_url", baseUrl)
            .putString("session_id", sessionId)
            .putString("token", token)
            .apply()
    }

    companion object {
        fun load(prefs: android.content.SharedPreferences): ConnectionInfo? {
            val base = prefs.getString("base_url", null) ?: return null
            val sid = prefs.getString("session_id", null) ?: return null
            val token = prefs.getString("token", null) ?: return null
            return ConnectionInfo(base, sid, token)
        }

        fun clear(prefs: android.content.SharedPreferences) {
            prefs.edit().remove("base_url").remove("session_id").remove("token").apply()
        }

        fun fromRawScan(raw: String): ConnectionInfo? {
            val uri = Uri.parse(raw.trim())
            val baseUrl = uri.getQueryParameter("baseUrl")
            val sessionId = uri.getQueryParameter("sessionId")
            val token = uri.getQueryParameter("token")
            if (baseUrl.isNullOrBlank() || sessionId.isNullOrBlank() || token.isNullOrBlank()) return null
            return ConnectionInfo(baseUrl.trimEnd('/'), sessionId, token)
        }
    }
}

private object ApiClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    data class LiveMiss(
        val rackNumber: Int,
        val ballNumber: Int,
        val types: List<String>,
        val outcome: String,
        val createdAt: String
    )

    data class LiveState(
        val currentRackId: String?,
        val suggestedNextBall: Int?,
        val effectiveDuration: Int,
        val isPaused: Boolean,
        val playedBallNumbers: Set<Int>,
        val recentMisses: List<LiveMiss>
    )

    data class LiveFetchResult(val ok: Boolean, val message: String = "", val state: LiveState? = null)
    data class SubmitResult(val ok: Boolean, val message: String = "")
    data class PauseResult(val ok: Boolean, val message: String = "")
    data class EndRackResult(val ok: Boolean, val message: String = "")
    data class StartRackResult(val ok: Boolean, val message: String = "")
    data class UndoResult(val ok: Boolean, val message: String = "")

    suspend fun fetchLiveState(connection: ConnectionInfo): LiveFetchResult = withContext(Dispatchers.IO) {
        try {
            val liveReq = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/mobile/live",
                connection
            )
            val liveResp = client.newCall(liveReq).execute()
            if (!liveResp.isSuccessful) {
                return@withContext LiveFetchResult(false, "Could not load live session (${liveResp.code})")
            }
            val liveBody = liveResp.body?.string().orEmpty()
            val liveJson = JSONObject(liveBody)
            val rackRaw = liveJson.opt("currentRackId")
            val rackId = when (rackRaw) {
                null, JSONObject.NULL -> null
                else -> rackRaw.toString().takeIf { it.isNotBlank() && it.lowercase() != "null" }
            }
            val suggested = liveJson.optInt("suggestedNextBall", 0).takeIf { it in 1..9 }
            val effectiveDuration = liveJson.optInt("effectiveDuration", 0).coerceAtLeast(0)
            val isPaused = liveJson.optBoolean("isPaused", false)

            val played = mutableSetOf<Int>()
            val playedArr = liveJson.optJSONArray("playedBallNumbers")
            if (playedArr != null) {
                for (i in 0 until playedArr.length()) {
                    val b = playedArr.optInt(i, 0)
                    if (b in 1..9) played.add(b)
                }
            }

            val recent = mutableListOf<LiveMiss>()
            val recentArr = liveJson.optJSONArray("recentMisses")
            if (recentArr != null) {
                for (i in 0 until recentArr.length()) {
                    val item = recentArr.optJSONObject(i) ?: continue
                    val tArr = item.optJSONArray("types")
                    val t = mutableListOf<String>()
                    if (tArr != null) {
                        for (j in 0 until tArr.length()) {
                            val s = tArr.optString(j)
                            if (s.isNotBlank()) t.add(s)
                        }
                    }
                    recent.add(
                        LiveMiss(
                            rackNumber = item.optInt("rackNumber", 0),
                            ballNumber = item.optInt("ballNumber", 0),
                            types = t,
                            outcome = item.optString("outcome", "unknown"),
                            createdAt = item.optString("createdAt", "")
                        )
                    )
                }
            }
            LiveFetchResult(
                ok = true,
                state = LiveState(
                    currentRackId = rackId,
                    suggestedNextBall = suggested,
                    effectiveDuration = effectiveDuration,
                    isPaused = isPaused,
                    playedBallNumbers = played,
                    recentMisses = recent
                )
            )
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            LiveFetchResult(false, msg)
        }
    }

    suspend fun submitMiss(
        connection: ConnectionInfo,
        rackId: String,
        ball: Int,
        types: List<String>,
        outcome: String
    ): SubmitResult = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject()
                .put("ballNumber", ball)
                .put("types", org.json.JSONArray(types))
                .put("outcome", outcome)

            val missReq = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/racks/$rackId/misses",
                connection
            )
                .newBuilder()
                .post(payload.toString().toRequestBody(jsonType))
                .build()
            val missResp = client.newCall(missReq).execute()
            if (!missResp.isSuccessful) {
                return@withContext SubmitResult(false, "Miss save failed (${missResp.code})")
            }
            SubmitResult(true)
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            SubmitResult(false, msg)
        }
    }

    suspend fun togglePause(connection: ConnectionInfo, pause: Boolean): PauseResult = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().put("pause", pause)
            val req = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/pause",
                connection
            ).newBuilder()
                .post(payload.toString().toRequestBody(jsonType))
                .header("Content-Type", "application/json")
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                return@withContext PauseResult(false, "Could not toggle timer (${res.code})")
            }
            PauseResult(true)
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            PauseResult(false, msg)
        }
    }

    suspend fun endRack(connection: ConnectionInfo, rackId: String): EndRackResult = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject()
            val req = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/racks/$rackId/end",
                connection
            ).newBuilder()
                .post(payload.toString().toRequestBody(jsonType))
                .header("Content-Type", "application/json")
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                return@withContext EndRackResult(false, "Could not end rack (${res.code})")
            }
            EndRackResult(true)
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            EndRackResult(false, msg)
        }
    }

    suspend fun startRack(connection: ConnectionInfo): StartRackResult = withContext(Dispatchers.IO) {
        try {
            val req = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/racks",
                connection
            ).newBuilder()
                .post("".toRequestBody(null))
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                return@withContext StartRackResult(false, "Could not start rack (${res.code})")
            }
            StartRackResult(true)
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            StartRackResult(false, msg)
        }
    }

    suspend fun undoLastMiss(connection: ConnectionInfo): UndoResult = withContext(Dispatchers.IO) {
        try {
            val req = authedRequest(
                "${connection.baseUrl}/api/sessions/${connection.sessionId}/undo-miss",
                connection
            ).newBuilder()
                .post("".toRequestBody(null))
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                return@withContext UndoResult(false, "Could not undo miss (${res.code})")
            }
            UndoResult(true)
        } catch (e: Exception) {
            val msg = when (e) {
                is SocketTimeoutException ->
                    "Could not reach desktop app (timeout). Check same Wi-Fi and firewall."
                is ConnectException, is UnknownHostException ->
                    "Desktop app is unreachable. Check same Wi-Fi and allow app through firewall."
                else -> e.message ?: "Request failed"
            }
            UndoResult(false, msg)
        }
    }

    private fun authedRequest(url: String, connection: ConnectionInfo): Request {
        return Request.Builder()
            .url(url)
            .header("Authorization", "Bearer ${connection.token}")
            .header("X-Elite-Mobile-Client", "android-v1")
            .build()
    }
}

private fun formatDuration(totalSeconds: Int): String {
    val safe = totalSeconds.coerceAtLeast(0)
    val hrs = safe / 3600
    val mins = (safe % 3600) / 60
    val secs = safe % 60
    return "%02d:%02d:%02d".format(hrs, mins, secs)
}
