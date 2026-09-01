<script lang="ts">
	import { PDFDocument } from 'pdf-lib';

	type ImageItem = {
		file: File;
		url: string;
		width: number;
		height: number;
	};

	const MM_TO_PT = 2.83465;
	const PAGE_FORMATS_PT: Record<string, [number, number]> = {
		a4: [595.28, 841.89],
		letter: [612, 792]
	};
	const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

	let images = $state<ImageItem[]>([]);
	let dragSrcIndex = $state<number | null>(null);
	let isDragOver = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	let pdfTitle = $state('Merged Document');
	let pdfAuthor = $state('');
	let pdfSubject = $state('');
	let pdfKeywords = $state('');
	let pageSize = $state('a4');
	let fileName = $state('merged.pdf');
	let status = $state('');
	let statusType = $state<'error' | 'success' | ''>('');

	function handleDragZoneOnDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragZoneOnDragLeave() {
		isDragOver = false;
	}

	function handleDragZoneOnDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		void handleFiles(event.dataTransfer?.files ?? null);
	}

	function handleDragZoneInputOnChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void handleFiles(input.files);
	}

	function handleThumbOnDragStart(event: DragEvent, index: number) {
		dragSrcIndex = index;
	}

	function handleThumbOnDragEnd() {
		dragSrcIndex = null;
	}

	function handleThumbOnDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleThumbOnDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		reorderImages(targetIndex);
	}

	function handleThumbDeleteButtonOnClick(index: number) {
		images = images.filter((_, currentIndex) => currentIndex !== index);
	}

	function sortImagesByFileName() {
		images = [...images].sort((a, b) => collator.compare(a.file.name, b.file.name));
	}

	async function readImageFile(file: File): Promise<ImageItem> {
		return await new Promise((resolvePromise, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result !== 'string') {
					reject(new Error('Unable to read image file.'));
					return;
				}

				const img = new Image();
				img.onload = () => {
					resolvePromise({
						file,
						url: result,
						width: img.naturalWidth,
						height: img.naturalHeight
					});
				};
				img.onerror = () => reject(new Error(`Unable to load image: ${file.name}`));
				img.src = result;
			};
			reader.onerror = () => reject(new Error(`Unable to read image: ${file.name}`));
			reader.readAsDataURL(file);
		});
	}

	async function handleFiles(fileList: FileList | null) {
		if (!fileList) return;
		const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
		if (files.length === 0) return;

		const loaded = await Promise.all(files.map((file) => readImageFile(file)));
		images = [...images, ...loaded];
		sortImagesByFileName();
		if (fileInputEl) fileInputEl.value = '';
	}

	function reorderImages(targetIndex: number) {
		if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
		const moved = images.splice(dragSrcIndex, 1)[0];
		images.splice(targetIndex, 0, moved);
		dragSrcIndex = null;
		images = [...images];
	}

	function clearAll() {
		images = [];
		status = '';
		statusType = '';
	}

	function resortImages() {
		sortImagesByFileName();
	}

	function normalizeImageToDataUrl(imgData: ImageItem): Promise<{ dataUrl: string; isPng: boolean }> {
		return new Promise((resolvePromise) => {
			const image = new Image();
			image.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					resolvePromise({ dataUrl: imgData.url, isPng: false });
					return;
				}

				ctx.drawImage(image, 0, 0);
				const mimeType = imgData.file.type;
				const isPng = mimeType.includes('png') || mimeType.includes('webp');
				const dataUrl = isPng
					? canvas.toDataURL('image/png')
					: canvas.toDataURL('image/jpeg', 0.92);

				resolvePromise({ dataUrl, isPng });
			};

			image.src = imgData.url;
		});
	}

	async function dataUrlToUint8Array(dataUrl: string) {
		const response = await fetch(dataUrl);
		const buffer = await response.arrayBuffer();
		return new Uint8Array(buffer);
	}

	async function generatePdf() {
		if (images.length === 0) return;

		const title = pdfTitle.trim() || 'Merged Document';
		const author = pdfAuthor.trim();
		const subject = pdfSubject.trim();
		const keywords = pdfKeywords
			.trim()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
		const pageSizeChoice = pageSize;
		let outputName = fileName.trim() || 'merged.pdf';
		if (!outputName.toLowerCase().endsWith('.pdf')) outputName += '.pdf';

		status = '正在用 pdf-lib 產生 PDF，請稍候...';
		statusType = '';

		try {
			const pdfDoc = await PDFDocument.create();

			for (const imgData of images) {
				const { dataUrl, isPng } = await normalizeImageToDataUrl(imgData);
				const bytes = await dataUrlToUint8Array(dataUrl);
				const embeddedImage = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

				const isLandscape = imgData.width >= imgData.height;
				let pageWidth: number;
				let pageHeight: number;

				if (pageSizeChoice === 'fit') {
					pageWidth = imgData.width;
					pageHeight = imgData.height;
				} else {
					const [baseW, baseH] = PAGE_FORMATS_PT[pageSizeChoice] || PAGE_FORMATS_PT.a4;
					const portraitW = Math.min(baseW, baseH);
					const portraitH = Math.max(baseW, baseH);

					if (isLandscape) {
						pageWidth = portraitH;
						pageHeight = portraitW;
					} else {
						pageWidth = portraitW;
						pageHeight = portraitH;
					}
				}

				const page = pdfDoc.addPage([pageWidth, pageHeight]);

				let drawW: number;
				let drawH: number;

				if (pageSizeChoice === 'fit') {
					drawW = pageWidth;
					drawH = pageHeight;
				} else {
					const margin = 10 * MM_TO_PT;
					const availW = pageWidth - margin * 2;
					const availH = pageHeight - margin * 2;
					const imgRatio = imgData.width / imgData.height;
					const availRatio = availW / availH;

					if (imgRatio > availRatio) {
						drawW = availW;
						drawH = availW / imgRatio;
					} else {
						drawH = availH;
						drawW = availH * imgRatio;
					}
				}

				const x = (pageWidth - drawW) / 2;
				const y = (pageHeight - drawH) / 2;

				page.drawImage(embeddedImage, { x, y, width: drawW, height: drawH });
			}

			pdfDoc.setTitle(title);
			if (author) pdfDoc.setAuthor(author);
			if (subject) pdfDoc.setSubject(subject);
			if (keywords.length) pdfDoc.setKeywords(keywords);

			pdfDoc.setCreator('Images-to-PDF Tool (pdf-lib)');
			pdfDoc.setProducer('pdf-lib');
			pdfDoc.setCreationDate(new Date());

			const pdfBytes = await pdfDoc.save();
			const pdfBuffer = new Uint8Array(pdfBytes.length);
			pdfBuffer.set(pdfBytes);
			const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = outputName;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);

			status = `✅ 已產生並下載「${outputName}」（標題：${title}，作者：${author || '（未設定）'}）`;
			statusType = 'success';
		} catch (error) {
			console.error(error);
			status = '❌ 產生 PDF 時發生錯誤：' + (error instanceof Error ? error.message : 'Unknown error');
			statusType = 'error';
		}
	}
</script>

<div class="container">
	<h1 class="text-3xl font-bold mb-6">圖片合併 PDF 工具</h1>
	<div class="subtitle mb-9">
		<p class="">
			上傳多張圖片，自動依檔案名稱排序，並可自訂 PDF 標題／作者等中繼資料。
		</p>
		<p>
			全部在瀏覽器本機處理，圖片不會上傳到任何伺服器。
		</p>
	</div>

	<div class="panel">
		<h2>1. 上傳圖片</h2>
		<div
			class:dragover={isDragOver}
			class="dropzone"
			role="group" aria-label="drop zone"
			onclick={() => fileInputEl?.click()}
			ondragover={handleDragZoneOnDragOver}
			ondragleave={handleDragZoneOnDragLeave}
			ondrop={handleDragZoneOnDrop}
		>
			<div>拖放圖片到這裡，或點擊選擇檔案</div>
			<div class="hint">
				支援 JPG / PNG / WebP / GIF / BMP，可一次選多張，會自動依檔案名稱排序（WebP 會以 PNG
				格式處理以保留透明度）
			</div>
			<input
				bind:this={fileInputEl}
				type="file"
				accept="image/*"
				multiple
				onchange={handleDragZoneInputOnChange}
			/>
		</div>

		{#if images.length > 0}
			<div class="thumbs">
				{#each images as image, index (image.file.name + image.file.lastModified + index)}
					<div
						class="thumb"
						draggable="true"
						ondragstart={(event) => handleThumbOnDragStart(event, index)}
						ondragend={handleThumbOnDragEnd}
						ondragover={handleThumbOnDragOver}
						ondrop={(event) => handleThumbOnDrop(event, index)}
					>
						<span class="idx">{index + 1}</span>
						<img src={image.url} alt={image.file.name} />
						<span class="fname" title={image.file.name}>{image.file.name}</span>
						<button
							type="button"
							class="del"
							onclick={() => handleThumbDeleteButtonOnClick(index)}
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-hint">尚未加入任何圖片</div>
		{/if}
	</div>

	<div class="panel">
		<h2>2. PDF 中繼資料設定</h2>
		<div class="form-row">
			<div class="form-group">
				<label for="pdfTitle">PDF 標題 (Title)</label>
				<input id="pdfTitle" type="text" bind:value={pdfTitle} placeholder="例如：出差收據合輯" />
			</div>
			<div class="form-group">
				<label for="pdfAuthor">PDF 作者 (Author)</label>
				<input id="pdfAuthor" type="text" bind:value={pdfAuthor} placeholder="例如：你的名字" />
			</div>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="pdfSubject">主旨 (Subject) — 選填</label>
				<input
					id="pdfSubject"
					type="text"
					bind:value={pdfSubject}
					placeholder="例如：2026 年 8 月出差單據"
				/>
			</div>
			<div class="form-group">
				<label for="pdfKeywords">關鍵字 (Keywords) — 選填，以逗號分隔</label>
				<input
					id="pdfKeywords"
					type="text"
					bind:value={pdfKeywords}
					placeholder="例如：收據, 出差, 報銷"
				/>
			</div>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="pageSize">頁面尺寸</label>
				<select id="pageSize" bind:value={pageSize}>
					<option value="a4">A4</option>
					<option value="letter">Letter</option>
					<option value="fit">貼合圖片原尺寸</option>
				</select>
			</div>
			<div class="form-group">
				<label for="fileName">下載檔案名稱</label>
				<input id="fileName" type="text" bind:value={fileName} placeholder="output.pdf" />
			</div>
		</div>
	</div>

	<div class="panel">
		<h2>3. 產生 PDF</h2>
		<div class="actions">
			<button type="button" class="primary" disabled={images.length === 0} onclick={generatePdf}>
				產生並下載 PDF
			</button>
			<button type="button" class="secondary" onclick={resortImages}>依檔名重新排序</button>
			<button type="button" class="secondary" onclick={clearAll}>清空全部</button>
		</div>

		{#if status}
			<div class={`status ${statusType}`}>{status}</div>
		{/if}
	</div>

	<footer>所有處理皆在你的瀏覽器內完成（pdf-lib，純前端），不會上傳任何圖片。</footer>
</div>

<style>
	.panel {
		background: #1a1d24;
		border: 1px solid #2b2f3a;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.panel h2 {
		font-size: 1rem;
		margin: 0 0 12px;
		color: #e8eaed;
	}

	.dropzone {
		border: 2px dashed #2b2f3a;
		border-radius: 10px;
		padding: 36px 16px;
		text-align: center;
		cursor: pointer;
		transition: 0.2s;
		color: #9aa0ac;
	}

	.dropzone.dragover {
		border-color: #4f8cff;
		background: rgba(79, 140, 255, 0.08);
		color: #e8eaed;
	}

	.dropzone input {
		display: none;
	}

	.dropzone .hint {
		font-size: 0.8rem;
		margin-top: 6px;
		line-height: 1.5;
	}

	.form-row {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}

	.form-group {
		flex: 1;
		min-width: 220px;
	}

	.form-group label {
		display: block;
		font-size: 0.85rem;
		color: #9aa0ac;
		margin-bottom: 6px;
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid #2b2f3a;
		background: #12141a;
		color: #e8eaed;
		font-size: 0.9rem;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #4f8cff;
	}

	.thumbs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
		margin-top: 16px;
	}

	.thumb {
		position: relative;
		border: 1px solid #2b2f3a;
		border-radius: 8px;
		overflow: hidden;
		background: #12141a;
		cursor: grab;
		aspect-ratio: 1 / 1;
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb .idx {
		position: absolute;
		top: 4px;
		left: 4px;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: 6px;
	}

	.thumb .fname {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		font-size: 0.65rem;
		padding: 3px 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thumb .del {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(229, 72, 77, 0.9);
		color: #fff;
		border: none;
		border-radius: 6px;
		width: 20px;
		height: 20px;
		font-size: 0.75rem;
		cursor: pointer;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.thumb .del:hover {
		background: #e5484d;
	}

	.empty-hint {
		color: #9aa0ac;
		font-size: 0.85rem;
		margin-top: 10px;
	}

	.actions {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	button.primary {
		background: #4f8cff;
		color: #fff;
		border: none;
		padding: 12px 22px;
		border-radius: 8px;
		font-size: 0.95rem;
		cursor: pointer;
		font-weight: 600;
	}

	button.primary:hover {
		background: #3a76e8;
	}

	button.primary:disabled {
		background: #3a3f4b;
		cursor: not-allowed;
	}

	button.secondary {
		background: transparent;
		color: #9aa0ac;
		border: 1px solid #2b2f3a;
		padding: 12px 18px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	button.secondary:hover {
		color: #e8eaed;
		border-color: #9aa0ac;
	}

	.status {
		margin-top: 12px;
		font-size: 0.85rem;
		color: #9aa0ac;
	}

	.status.error {
		color: #e5484d;
	}

	.status.success {
		color: #3ec97a;
	}

	footer {
		text-align: center;
		color: #9aa0ac;
		font-size: 0.75rem;
		margin-top: 30px;
	}
</style>
